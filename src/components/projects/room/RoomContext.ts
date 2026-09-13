import { createContext, useContext } from 'react';
import type { User } from '../../../services/UserService';
import type { ProjectFull } from '../../../types/projects';

export type SectionKey =
  | 'overview' | 'timeline' | 'phases' | 'issues' | 'risks' | 'decisions' | 'deliverables' | 'documents'
  | 'people' | 'events' | 'money' | 'client' | 'feed' | 'reports' | 'chat' | 'ask';

export interface RoomCtx {
  project: ProjectFull;
  /** يعيد جلب المشروع (الترويسة والمراحل والمواعيد) بعد أي تغيير */
  refresh: () => Promise<void>;
  users: User[];
  canEdit: boolean;
  canApprove: boolean;
  goTo: (section: SectionKey) => void;
  openTask: (taskId: number) => void;
}

export const RoomContext = createContext<RoomCtx | null>(null);

export const useRoom = (): RoomCtx => {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom خارج غرفة المشروع');
  return ctx;
};
