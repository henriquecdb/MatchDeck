import { modeLabels, type MatchSnapshot } from './match';
import type { Language } from './preferences';
import { translate } from '../i18n/translate';

const queues: Record<string, string> = {
  unranked: 'Não ranqueado',
  rm_1v1: 'Ranqueada · Mapa aleatório 1v1', rm_team: 'Ranqueada · Mapa aleatório equipes',
  ew_1v1: 'Ranqueada · Empire Wars 1v1', ew_team: 'Ranqueada · Empire Wars equipes',
  dm_1v1: 'Ranqueada · Death Match 1v1', dm_team: 'Ranqueada · Death Match equipes',
  qp_rm_1v1: 'Partida rápida · Mapa aleatório 1v1', qp_rm_team: 'Partida rápida · Mapa aleatório equipes',
  qp_ew_1v1: 'Partida rápida · Empire Wars 1v1', qp_ew_team: 'Partida rápida · Empire Wars equipes',
  qp_dm_1v1: 'Partida rápida · Death Match 1v1', qp_dm_team: 'Partida rápida · Death Match equipes',
};

export function queueLabel(match: MatchSnapshot): string {
  if (match.gameId === 'aoe4') return match.queue ?? (match.mode === 'ranked' ? 'RM 1v1' : 'QM 1v1');
  return (match.queueId && queues[match.queueId]) || match.queue || modeLabels[match.mode];
}

const aoe4Queues: Record<string, string> = {
  rm_solo: 'Ranqueada · Solo', rm_team: 'Ranqueada · Equipes',
  qm_1v1: 'Partida rápida · 1v1', qm_2v2: 'Partida rápida · 2v2',
  qm_3v3: 'Partida rápida · 3v3', qm_4v4: 'Partida rápida · 4v4',
  rm_1v1_elo: 'MMR ranqueado · 1v1', rm_2v2_elo: 'MMR ranqueado · 2v2',
  rm_3v3_elo: 'MMR ranqueado · 3v3', rm_4v4_elo: 'MMR ranqueado · 4v4',
};

export function profileQueueLabel(queueId: string | null, gameId = 'aoe2-de'): string {
  return queueId ? (gameId === 'aoe4' ? aoe4Queues : queues)[queueId] ?? queueId : 'Modalidade indisponível';
}

export function profileRatingLabel(queueId: string, gameId: string): string {
  if (gameId !== 'aoe4') return 'Rating';
  if (queueId.endsWith('_elo')) return 'MMR';
  return queueId.startsWith('rm_') ? 'Pontos ranqueados' : 'Rating';
}

export function ratingLabel(match: MatchSnapshot): string {
  return match.mode === 'quick' ? 'Rating de partidas rápidas' : match.mode === 'ranked' ? 'Rating ranqueado' : match.mode === 'custom' ? 'Rating não ranqueado' : 'Rating';
}

export function syncLabel(match: MatchSnapshot, language: Language = 'pt-BR'): string {
  if (!match.syncedAt) return translate(match.source === 'demo' && !match.replayOf ? 'Dados fictícios' : 'Horário de sincronização indisponível', language);
  const date = new Date(match.syncedAt);
  return Number.isNaN(date.getTime()) ? translate('Horário de sincronização indisponível', language) : translate('Sincronizado em {0}', language, { 0: date.toLocaleString(language) });
}

export const missingStats = 'A fonte não forneceu esta estatística para a fila da partida. O valor não é substituído por dados de outra modalidade.';
