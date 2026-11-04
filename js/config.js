export const VIEW_W = 540;
export const VIEW_H = 960;
export const CX = 270;
export const HORIZON_Y = 384;
export const CAM_DIST = 6;
export const CAM_HEIGHT = 3.5;
export const CAM_FOLLOW = 0.5;
export const FOCAL = 696;
export const DRAW_DIST = 120;
export const DESPAWN_Z = -5;

export const LANE_WIDTH = 2.5;
export const LANE_SWITCH_TIME = 0.15;
export const LANE_SWITCH_SPEED = LANE_WIDTH / LANE_SWITCH_TIME;

export const JUMP_V = 7.5;
export const GRAVITY = 25;
export const FAST_FALL_V = -15;
export const SLIDE_TIME = 0.6;
export const PLAYER_DEPTH = 0.6;

export const OBSTACLE_DEPTH = 1.0;
export const GATE_CLEAR_Y = 0.9;
export const ITEM_PICK_RANGE = 0.8;

export const FIRST_ROW_Z = 40;
export const ROW_GAP_MIN = 14;
export const ROW_GAP_TIME = 0.9;

export const SPEED_START = 12;
export const SPEED_GAIN = 0.15;
export const SPEED_MAX = 30;
export const STUMBLE_SPEED_MUL = 0.7;
export const STUMBLE_TIME = 2.0;
export const METER_HIT = 35;
export const METER_DECAY = 2;
export const METER_MAX = 100;
export const RESTART_LOCK = 0.6;

export const DT = 1 / 120;

export const UI_FONT = '"Baloo 2", system-ui, sans-serif';

export const SWIPE_MIN_PX = 24;
export const TAP_MAX_PX = 10;
export const TAP_MAX_MS = 300;

export const RUN_CYCLE_M = 7.0;
export const JUMP_ANIM_TIME = 0.6;
export const SLIDE_ANIM_TIME = 0.6;
export const STUMBLE_ANIM_TIME = 0.83;
export const POLICE_PHASE_OFFSET = 0.37;
export const POLICE_Z_FAR = -4.5;
export const POLICE_Z_NEAR = -1;
export const SPRITE_PX_PER_M = 128;
export const PROP_PX_PER_M = 160;
export const SIDE_PROP_GAP = 8;
export const WALL_X = 5.6;
export const WALL_H = 7.0;
export const WIN_PERIOD = 4.0;
export const ITEM_BOTTOM_Y = 0.25;
export const ITEM_BOB = 0.08;

export const SFX_VOL = 1.0;
export const BGM_VOL = 1.0;
export const MUSIC_FILE_VOL = 0.7;
export const SIREN_VOL = 0.08;
export const PROCEDURAL_VOL = 0.45;
export const SIREN_METER_THRESHOLD = 70;
export const MUSIC_LP_NORMAL = 9000;
export const MUSIC_LP_TENSE = 20000;
export const MUSIC_LP_TRANSITION = 0.5;
export const MUSIC_STUMBLE_VOL_MUL = 0.35;
export const MUSIC_STUMBLE_DROP_TIME = 0.08;
export const MUSIC_STUMBLE_RECOVER_TIME = 0.35;
export const MUSIC_CAUGHT_FADE_TIME = 0.3;
export const MUSIC_CROSSFADE_TIME = 1.0;

export const CHICKEN_SPEED_MUL = 0.85;
export const FLAP_V = 8.5;
export const DOUBLE_TAP_MS = 350;

export const CHERRY_SPEED_MUL = 0.85;
export const CHERRY_LIFE_METER = 40;
export const CHERRY_INVULN = 1.5;
export const LOBBY_ACTION_MIN = 4;
export const LOBBY_ACTION_MAX = 7;

export const SFX_PEAK = {
  lane: 0.025,
  drop: 0.04,
  slide: 0.045,
  jump: 0.05,
  flap: 0.06,
  throw: 0.07,
  pickup: 0.09,
  pickupYabai: 0.11,
  hit: 0.14,
  caught: 0.12
};

export const SFX_NOTES = {
  Gs1: 51.91,
  Gs2: 103.83,
  Gs3: 207.65,
  Ds4: 311.13,
  Gs4: 415.30,
  B4: 493.88,
  Ds5: 622.25,
  E5: 659.26,
  Gs5: 830.61,
  B5: 987.77,
  Ds6: 1244.51,
  Gs6: 1661.22
};

export const BILLBOARD_PERIOD = 56;
export const BILLBOARD_OFFSET = 4;
export const BILLBOARD_X = 5.0;
export const YABAI_TOKEN_M = 0.6;

export const GRACE_M = 100;
export const QUIP_MAX_W = 460;
export const FLOAT_SCORE_TIME = 0.6;
export const FLOAT_SCORE_RISE = 60;
export const SHAKE_TIME = 0.25;
export const SHAKE_AMP = 6;

export const OBSTACLE_TYPES = {
  GATE: { label: '改札', height: 1.0 },
  BARRIER: { label: '工事中', height: 2.2 },
  VENDING: { label: 'ドリンク', height: 2.5 }
};

export const ITEM_TYPES = {
  TICKET: { label: '切符', points: 10, prob: 0.48 },
  ONIGIRI: { label: 'おにぎり', points: 20, prob: 0.28 },
  SUIKA: { label: 'SUIKA', points: 30, prob: 0.15 },
  SALARY: { label: '給料', points: 50, prob: 0.05 },
  YABAI: { label: 'YABAI', points: 100, prob: 0.04 }
};
