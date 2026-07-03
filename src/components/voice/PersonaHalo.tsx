import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  useRive,
  useStateMachineInput,
  useViewModel,
  useViewModelInstance,
  useViewModelInstanceColor,
} from '@rive-app/react-webgl2';
import type { UseRiveParameters } from '@rive-app/react-webgl2';

/**
 * مؤثّر «Halo» البصري (من AI Elements) — رسم Rive/WebGL2 يتفاعل مع حالة المحادثة.
 * الملف halo-2.0.riv مستضاف ذاتياً في public/ (بلا اعتماد على CDN خارجي).
 */

export type PersonaState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'asleep';

interface PersonaHaloProps {
  state: PersonaState;
  className?: string;
  onReady?: () => void;
}

const STATE_MACHINE = 'default';
const HALO_SRC = '/halo-2.0.riv';

const isDark = (): boolean =>
  typeof document !== 'undefined' && document.body.classList.contains('dark');

/** يراقب ثيم التطبيق (body.dark) ليلوّن الهالة: كحلي نهاراً، أبيض ليلاً */
const useHaloColor = (): [number, number, number] => {
  const [dark, setDark] = useState(isDark);

  useEffect(() => {
    const observer = new MutationObserver(() => setDark(isDark()));
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // --law-navy: #1E3A5F
  return dark ? [255, 255, 255] : [30, 58, 95];
};

const PersonaHalo = memo(({ state, className, onReady }: PersonaHaloProps) => {
  // تأجيل التهيئة إطاراً واحداً — يمنع تسريب سياق WebGL2 عند أول mount سريع
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => {
      cancelAnimationFrame(id);
      setReady(false);
    };
  }, []);

  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  const riveParams = useMemo<UseRiveParameters>(
    () =>
      ready
        ? {
            src: HALO_SRC,
            stateMachines: STATE_MACHINE,
            autoplay: true,
            onRiveReady: () => onReadyRef.current?.(),
          }
        : null,
    [ready],
  );

  const { rive, RiveComponent } = useRive(riveParams);

  const listeningInput = useStateMachineInput(rive, STATE_MACHINE, 'listening');
  const thinkingInput = useStateMachineInput(rive, STATE_MACHINE, 'thinking');
  const speakingInput = useStateMachineInput(rive, STATE_MACHINE, 'speaking');
  const asleepInput = useStateMachineInput(rive, STATE_MACHINE, 'asleep');

  // مدخلات Rive كائنات قابلة للتغيير تُضبط بالإسناد المباشر (هذه واجهة Rive المقصودة)
  useEffect(() => {
    if (listeningInput) listeningInput.value = state === 'listening';
    if (thinkingInput) thinkingInput.value = state === 'thinking';
    if (speakingInput) speakingInput.value = state === 'speaking';
    if (asleepInput) asleepInput.value = state === 'asleep';
  }, [state, listeningInput, thinkingInput, speakingInput, asleepInput]);

  // تلوين الهالة عبر ViewModel الخاص بالملف
  const [r, g, b] = useHaloColor();
  const viewModel = useViewModel(rive, { useDefault: true });
  const viewModelInstance = useViewModelInstance(viewModel, { rive, useDefault: true });
  const viewModelColor = useViewModelInstanceColor('color', viewModelInstance);

  useEffect(() => {
    viewModelColor?.setRgb(r, g, b);
  }, [viewModelColor, r, g, b]);

  return <RiveComponent className={className} />;
});

PersonaHalo.displayName = 'PersonaHalo';

export default PersonaHalo;
