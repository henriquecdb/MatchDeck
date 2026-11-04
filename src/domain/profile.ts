export interface ProfileLeaderboard {
  leaderboardId: string;
  rating: number | null;
  wins: number | null;
  losses: number | null;
}

export interface RecentMatch {
  id: string;
  startedAt: string;
  queueId: string | null;
  map: string;
  civilizationId: string | null;
  civilization: string | null;
  won: boolean | null;
  ratingChange: number | null;
}

export interface ProfileOverview {
  profileId: number;
  name: string;
  leaderboards: ProfileLeaderboard[];
  recentMatches: RecentMatch[];
  fetchedAt: string;
}

export function profileWinRate(board: ProfileLeaderboard): number | null {
  if (board.wins == null || board.losses == null || board.wins + board.losses === 0) return null;
  return board.wins / (board.wins + board.losses) * 100;
}
