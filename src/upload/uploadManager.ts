/**
 * مدير رفع الملفات — مفردة تعيش خارج شجرة React.
 *
 * لماذا خارج الشجرة؟ لأن المطلوب أن يستمرّ الرفع بعد إغلاق نافذة الوثائق وبعد
 * التنقّل بين الصفحات. أي حالةٍ داخل مكوّنٍ تموت بإلغاء تركيبه (unmount)، وحتى
 * الـContext يموت إن أُعيد تركيب مضيفه. المفردة هنا وحدةُ وحدةٍ (module singleton)
 * تُنشأ مرّةً واحدة مع الحزمة وتبقى ما بقيت اللسانة مفتوحة، وReact يشترك عليها
 * بـuseSyncExternalStore فيرى تغيّراتها بلا أن يملكها.
 *
 * حدُّ ما ينجو منه: تحديثُ الصفحة (F5) يُعدم كل شيء — الملفات نفسها كائناتُ File
 * حيّة في ذاكرة اللسانة ولا تُسلسَل. لذلك نحذّر قبل المغادرة.
 *
 * الرفع يذهب من المتصفّح إلى مايكروسوفت مباشرةً؛ سيرفرنا لا يرى بايتاً واحداً،
 * إنما يفتح الجلسة في البداية ويسجّل الوثيقة في النهاية.
 */

import { CloudStorageService } from '../services/cloudStorageService';

/** يطابق uploads.limits.direct_max_mb في config/uploads.php — السيرفر هو الحَكَم، وهذا فحصٌ مبكر لتجربةٍ أفضل */
export const MAX_UPLOAD_MB = 50;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

/** ثلاثة معاً: أسرع من التسلسل، ودون حدّ المتصفّح (٦ اتصالات للنطاق) فيبقى متّسعٌ لبقية النظام */
const MAX_PARALLEL = 3;

/** التقدّم يرد عشرات المرّات في الثانية؛ بلا كبحٍ يُعاد رسم الشريط بلا طائل */
const PROGRESS_THROTTLE_MS = 180;

export type UploadStatus = 'queued' | 'uploading' | 'done' | 'failed' | 'canceled';

/** أين تنتمي هذه الملفات — يُعرض للمستخدم ليعرف أيّ رفعةٍ تخصّ أيّ قضية */
export interface UploadContext {
  kind: 'case' | 'task' | 'client';
  id: number;
  label: string;
}

export interface UploadItem {
  id: string;
  fileName: string;
  size: number;
  status: UploadStatus;
  /** 0..100 */
  progress: number;
  loaded: number;
  /** بايت/ثانية — null قبل توفّر قياسٍ ذي معنى */
  speed: number | null;
  /** ثوانٍ متبقّية تقديراً — null إن تعذّر الحساب */
  eta: number | null;
  error?: string;
  context: UploadContext;
}

export interface UploadSnapshot {
  items: UploadItem[];
  activeCount: number;
  doneCount: number;
  failedCount: number;
  /** إجمالي نسبة التقدّم للرفعات غير المنتهية — لعرضه على الشريط المطوي */
  overallProgress: number;
  hasActive: boolean;
}

interface InternalItem extends UploadItem {
  file: File;
  abort?: () => void;
  startedAt?: number;
  lastEmit: number;
}

const EMPTY_SNAPSHOT: UploadSnapshot = {
  items: [],
  activeCount: 0,
  doneCount: 0,
  failedCount: 0,
  overallProgress: 0,
  hasActive: false,
};

class UploadManager {
  private items: InternalItem[] = [];
  private listeners = new Set<() => void>();
  private snapshot: UploadSnapshot = EMPTY_SNAPSHOT;
  private running = 0;
  private seq = 0;
  private beforeUnloadBound = false;
  private completionListeners = new Set<(item: UploadItem) => void>();

  /**
   * إشعارٌ عند انتهاء رفعةٍ واحدة (نجاحاً أو فشلاً).
   *
   * تحتاجه الشاشات لتحديث قوائمها: نافذة وثائق القضية تعيد تحميل قائمتها حين
   * تهبط وثيقةٌ جديدة فيها. لا يصلح لذلك مراقبةُ اللقطة العامة، لأنها تتغيّر
   * مع كل نبضة تقدّم فتُغرق الشاشة بنداءات تحميلٍ لا لزوم لها.
   */
  onCompleted(listener: (item: UploadItem) => void): () => void {
    this.completionListeners.add(listener);
    return () => {
      this.completionListeners.delete(listener);
    };
  }

  // ————————————————— واجهة الاشتراك (useSyncExternalStore) —————————————————

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * يجب أن يعيد **المرجع نفسه** ما لم تتغيّر الحالة، وإلّا دخل React في حلقة
   * إعادة رسمٍ لا تنتهي. لذلك نبني اللقطة عند التغيير فقط لا عند كل نداء.
   */
  getSnapshot = (): UploadSnapshot => this.snapshot;

  // ————————————————————————— الإضافة —————————————————————————

  /**
   * يضيف ملفات إلى الطابور ويبدأ التشغيل.
   * @returns الملفات المرفوضة لتجاوز الحجم، ليعرضها المستدعي في مكانه.
   */
  enqueue(files: File[] | FileList, context: UploadContext): { rejected: { name: string; size: number }[] } {
    const list = Array.from(files);
    const rejected: { name: string; size: number }[] = [];

    for (const file of list) {
      if (file.size > MAX_UPLOAD_BYTES) {
        rejected.push({ name: file.name, size: file.size });
        continue;
      }

      this.items.push({
        id: `up_${Date.now()}_${this.seq++}`,
        file,
        fileName: file.name,
        size: file.size,
        status: 'queued',
        progress: 0,
        loaded: 0,
        speed: null,
        eta: null,
        context,
        lastEmit: 0,
      });
    }

    this.emit();
    this.pump();

    return { rejected };
  }

  // ————————————————————————— التحكّم —————————————————————————

  retry(id: string): void {
    const item = this.items.find((i) => i.id === id);
    if (!item || (item.status !== 'failed' && item.status !== 'canceled')) return;

    // بلا تقطيعٍ لا استئناف: الرفع يبدأ من الصفر لا من موضع الانقطاع
    item.status = 'queued';
    item.progress = 0;
    item.loaded = 0;
    item.speed = null;
    item.eta = null;
    item.error = undefined;
    item.startedAt = undefined;

    this.emit();
    this.pump();
  }

  retryAllFailed(): void {
    this.items.forEach((item) => {
      if (item.status === 'failed') {
        item.status = 'queued';
        item.progress = 0;
        item.loaded = 0;
        item.speed = null;
        item.eta = null;
        item.error = undefined;
        item.startedAt = undefined;
      }
    });

    this.emit();
    this.pump();
  }

  cancel(id: string): void {
    const item = this.items.find((i) => i.id === id);
    if (!item) return;

    if (item.status === 'uploading') {
      item.abort?.();
      return; // onabort يتكفّل بضبط الحالة وتحرير المقعد
    }

    if (item.status === 'queued') {
      item.status = 'canceled';
      this.emit();
    }
  }

  /** يزيل المنتهية (نجاحاً أو فشلاً أو إلغاءً) ويُبقي الجارية والمنتظرة */
  clearFinished(): void {
    this.items = this.items.filter(
      (i) => i.status === 'uploading' || i.status === 'queued'
    );
    this.emit();
  }

  /** يزيل صفّاً واحداً منتهياً */
  dismiss(id: string): void {
    const item = this.items.find((i) => i.id === id);
    if (!item || item.status === 'uploading' || item.status === 'queued') return;

    this.items = this.items.filter((i) => i.id !== id);
    this.emit();
  }

  // ————————————————————————— المحرّك —————————————————————————

  private pump(): void {
    while (this.running < MAX_PARALLEL) {
      const next = this.items.find((i) => i.status === 'queued');
      if (!next) break;

      this.running += 1;
      void this.run(next);
    }

    this.bindBeforeUnload();
  }

  private async run(item: InternalItem): Promise<void> {
    item.status = 'uploading';
    item.startedAt = Date.now();
    this.emit();

    try {
      const { kind, id } = item.context;

      // ١) جلسة الرفع تُفتح من سيرفرنا (فيبقى توكن مايكروسوفت عندنا لا في المتصفّح)
      const urlResponse =
        kind === 'case'
          ? await CloudStorageService.getUploadUrl(id, item.file.name, item.file.size)
          : { success: false as const, error: 'نوع الرفع غير مدعوم بعد' };

      if (!urlResponse.success || !urlResponse.upload_url) {
        this.finish(item, 'failed', urlResponse.error || 'تعذّر بدء الرفع');
        return;
      }

      // ٢) البايتات تذهب من المتصفّح إلى مايكروسوفت مباشرةً — لا تمرّ بسيرفرنا
      const uploaded = await this.put(item, urlResponse.upload_url);
      if (!uploaded.success) {
        this.finish(item, uploaded.canceled ? 'canceled' : 'failed', uploaded.error);
        return;
      }

      // ٣) تسجيل الوثيقة في القضية
      const registered = await CloudStorageService.registerUploadedFile({
        case_id: id,
        cloud_file_id: uploaded.fileId!,
        file_name: item.file.name,
        file_size: item.file.size,
        mime_type: item.file.type,
        web_url: uploaded.webUrl,
      });

      if (!registered.success) {
        // الملف على OneDrive فعلاً لكنه بلا صفٍّ عندنا — لا نقول «نجح»
        this.finish(item, 'failed', registered.error || 'رُفع الملف ولم يُسجَّل في القضية');
        return;
      }

      item.progress = 100;
      item.loaded = item.size;
      this.finish(item, 'done');
    } catch (err) {
      console.error('uploadManager run error:', err);
      this.finish(item, 'failed', 'عطل غير متوقّع أثناء الرفع');
    }
  }

  /** رفع الملف بـXHR: هو وحده يعطي تقدّم الرفع بالبايت ويقبل الإلغاء (fetch لا يفعل) */
  private put(
    item: InternalItem,
    uploadUrl: string
  ): Promise<{ success: boolean; fileId?: string; webUrl?: string; error?: string; canceled?: boolean }> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);

      // لا ترويسة Authorization إطلاقاً: رابط الجلسة مُصادَقٌ مسبقاً، وإضافتها تُنتج 401
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      xhr.setRequestHeader('Content-Range', `bytes 0-${item.size - 1}/${item.size}`);

      item.abort = () => xhr.abort();

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;

        item.loaded = event.loaded;
        item.progress = Math.min(99, Math.round((event.loaded / event.total) * 100));

        const elapsed = (Date.now() - (item.startedAt || Date.now())) / 1000;
        if (elapsed > 0.5) {
          item.speed = event.loaded / elapsed;
          const remaining = event.total - event.loaded;
          item.eta = item.speed > 0 ? Math.round(remaining / item.speed) : null;
        }

        // كبحٌ زمني: التقدّم يرد أسرع من قدرة العين، وإعادة الرسم ليست مجّانية
        const now = Date.now();
        if (now - item.lastEmit >= PROGRESS_THROTTLE_MS) {
          item.lastEmit = now;
          this.emit();
        }
      };

      xhr.onload = () => {
        item.abort = undefined;

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({ success: true, fileId: response.id, webUrl: response.webUrl });
          } catch {
            resolve({ success: false, error: 'ردٌّ غير مفهوم من OneDrive' });
          }
          return;
        }

        // 413 تعني تجاوز حدّ مايكروسوفت للطلب الواحد — رسالةٌ مفهومة بدل رقم
        resolve({
          success: false,
          error:
            xhr.status === 413
              ? `الملف أكبر من الحدّ المسموح (${MAX_UPLOAD_MB} ميجابايت)`
              : `رفض OneDrive الرفع (${xhr.status})`,
        });
      };

      xhr.onerror = () => {
        item.abort = undefined;
        resolve({ success: false, error: 'انقطع الاتصال أثناء الرفع' });
      };

      xhr.onabort = () => {
        item.abort = undefined;
        resolve({ success: false, canceled: true, error: 'أُلغي الرفع' });
      };

      xhr.send(item.file);
    });
  }

  private finish(item: InternalItem, status: UploadStatus, error?: string): void {
    item.status = status;
    item.error = error;
    item.speed = null;
    item.eta = null;
    item.abort = undefined;

    this.running = Math.max(0, this.running - 1);
    this.emit();

    const finished = this.snapshot.items.find((i) => i.id === item.id);
    if (finished) {
      this.completionListeners.forEach((listener) => {
        try {
          listener(finished);
        } catch (err) {
          // مستمعٌ ينهار لا يوقف بقيّة الطابور
          console.error('uploadManager completion listener error:', err);
        }
      });
    }

    this.pump();
  }

  // ————————————————————————— اللقطة والتنبيه —————————————————————————

  private emit(): void {
    let activeCount = 0;
    let doneCount = 0;
    let failedCount = 0;
    let totalBytes = 0;
    let loadedBytes = 0;

    for (const item of this.items) {
      if (item.status === 'uploading' || item.status === 'queued') {
        activeCount += 1;
        totalBytes += item.size;
        loadedBytes += item.loaded;
      } else if (item.status === 'done') {
        doneCount += 1;
      } else if (item.status === 'failed') {
        failedCount += 1;
      }
    }

    this.snapshot = {
      items: this.items.map((item) => ({
        id: item.id,
        fileName: item.fileName,
        size: item.size,
        status: item.status,
        progress: item.progress,
        loaded: item.loaded,
        speed: item.speed,
        eta: item.eta,
        error: item.error,
        context: item.context,
      })),
      activeCount,
      doneCount,
      failedCount,
      overallProgress: totalBytes > 0 ? Math.round((loadedBytes / totalBytes) * 100) : 0,
      hasActive: activeCount > 0,
    };

    this.listeners.forEach((listener) => listener());
    this.syncBeforeUnload();
  }

  /**
   * تحذير المغادرة يُسجَّل عند وجود رفعٍ جارٍ ويُزال بعده.
   *
   * تنبيهان لا بدّ من قولهما: المتصفّحات منذ ٢٠١٦ لا تعرض نصّاً مخصّصاً بل نصَّها
   * العام، ولا تعرض الحوار أصلاً ما لم يتفاعل المستخدم مع الصفحة. ولا نُبقي
   * المستمع دائماً لأن وجوده يمنع Firefox من وضع الصفحة في bfcache.
   */
  private bindBeforeUnload(): void {
    this.syncBeforeUnload();
  }

  private syncBeforeUnload(): void {
    const shouldBind = this.snapshot.hasActive;

    if (shouldBind && !this.beforeUnloadBound) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      this.beforeUnloadBound = true;
    } else if (!shouldBind && this.beforeUnloadBound) {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      this.beforeUnloadBound = false;
    }
  }
}

function handleBeforeUnload(event: BeforeUnloadEvent): void {
  event.preventDefault();
  // القيمة مُهمَلة في المتصفّحات الحديثة لكنها لازمة لبعض القديمة
  event.returnValue = '';
}

export const uploadManager = new UploadManager();
