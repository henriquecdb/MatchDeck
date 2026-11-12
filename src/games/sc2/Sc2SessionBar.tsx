import type { Sc2Session } from '../../domain/sc2-session';
import { SessionBar } from '../../features/session/SessionBar';
export function Sc2SessionBar({ session }: { session: Sc2Session }) { return <SessionBar session={session} label="Sessão de StarCraft II" />; }
