export interface Ratings {
  rank: number;
  rating: number;
  winCnt: number;
  loseCnt: number;
}

export interface Player {
  gamerTag: string;
  countryCode: string;
  birthday: string;
}

export interface Placement {
  placement: number;
  cptPoint: number;
  playerId: string;
  event: string;
}

export interface Match {
  Datetime: string;
  Event: string;
  Bracket: string;
  Round: string;
  Player1: string;
  Player2: string;
  Player1Score: string;
  Player2Score: string;
  Player1Chars: string;
  Player2Chars: string;
  RateDiff: number;
}
