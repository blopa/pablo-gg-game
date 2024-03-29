export const TILE_WIDTH = 16;
export const TILE_HEIGHT = 16;

export const MIN_GAME_WIDTH = 25 * TILE_WIDTH; // 400
export const MIN_GAME_HEIGHT = 14 * TILE_HEIGHT; // 224

export const RESIZE_THRESHOLD = 500;
export const RE_RESIZE_THRESHOLD = 10;
export const OVERLAY_DIV_RESIZE_THRESHOLD = RE_RESIZE_THRESHOLD;

export const HERO_SPRITE_NAME = 'hero';
export const BOMB_SPRITE_NAME = 'bomb';

export const SWORD_SPRITE_NAME = 'sword';
export const SLIME_SPRITE_NAME = 'slime';
export const ENEMY_SPRITE_PREFIX = 'enemy';

// Game Objects Tiled IDs
export const SLIME_TILE_INDEX = 11;
export const DOOR_TILE_INDEX = 13;

// Element types
export const ELEMENT_BOX_TYPE = 'box_type';
export const ELEMENT_GRASS_TYPE = 'grass_type';
export const ELEMENT_CRACK_TYPE = 'crack_type';

export const IDLE_FRAME = 'walk_position_02';
export const IDLE_FRAME_POSITION_KEY = 'position';

// Directions
export const RIGHT_DIRECTION = 'right';
export const LEFT_DIRECTION = 'left';
export const UP_DIRECTION = 'up';
export const DOWN_DIRECTION = 'down';

// Controls
export const ACTION_KEY = 'action';
export const ACTION_ITEM = 'item';
export const ACTION_CANCEL = 'cancel';

export const IGNORED_TILESETS = ['tileset_objects'];

// Keys
export const ENTER_KEY = 'Enter';
export const SPACE_KEY = 'Space';
export const ESCAPE_KEY = 'Escape';
export const ARROW_LEFT_KEY = 'ArrowLeft';
export const ARROW_UP_KEY = 'ArrowUp';
export const ARROW_RIGHT_KEY = 'ArrowRight';
export const ARROW_DOWN_KEY = 'ArrowDown';

// DOM identifiers
export const GAME_CONTENT_ID = 'game-content';
export const REACT_CONTENT_ID = 'react-content';

export const BOOT_SCENE_NAME = 'BootScene';

export const DEFAULT_LOCALE = 'en';

export const SHOULD_TILE_COLLIDE = 'should-tile-collide';

// Enemies behaviours
export const FOLLOW_BEHAVIOUR = 'follow-behaviour';
export const PATROL_BEHAVIOUR = 'patrol-behaviour';

// Depth
export const HERO_DEPTH = 100;
export const UI_DEPTH = 200;
export const ENEMY_DEPTH = 20;
export const DEPTH_DIFF = 10;

export const ITEM_DEPTH = HERO_DEPTH - DEPTH_DIFF;
export const RAINY_WEATHER = 'rainy';

export const SNOWY_WEATHER = 'snowy';

export const STORMY_WEATHER = 'stormy';

export const WEATHER_STRENGTH_WEAK = 'weak';

export const WEATHER_STRENGTH_MEDIUM = 'medium';

export const WEATHER_STRENGTH_STRONG = 'strong';

export const WEATHER_DIRECTION_LEFT = 'left';

export const WEATHER_DIRECTION_RIGHT = 'right';

export const MAP_TYPE_INDOOR = 'indoor';

export const MAP_TYPE_OUTDOOR = 'outdoor';

export const LAYER_TYPE_TERRAIN = 'terrain';

// Fade animations
export const FADE_ANIMATION_NONE = 'none';
export const FADE_ANIMATION_LEFT = 'left';
export const FADE_ANIMATION_RIGHT = 'right';
export const FADE_ANIMATION_UP = 'up';
export const FADE_ANIMATION_DOWN = 'down';
