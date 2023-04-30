// Constants
import {
    ACTION_KEY,
    IDLE_FRAME,
    ACTION_ITEM,
    UP_DIRECTION,
    ACTION_CANCEL,
    LEFT_DIRECTION,
    DOWN_DIRECTION,
    RIGHT_DIRECTION,
    IDLE_FRAME_POSITION_KEY,
} from '../../constants';

// Utils
import { changeScene } from '../../utils/sceneHelpers';
import { getSelectorData } from '../../utils/utils';

// Selectors
import { selectHeroSetters } from '../../zustand/hero/selectHeroData';
import { selectMapSetters } from '../../zustand/map/selectMapData';
import { selectMenuSetters } from '../../zustand/menu/selectMenu';
import { selectTextSetters } from '../../zustand/text/selectText';
import { selectGameHeight } from '../../zustand/game/selectGameData';

export const sceneHelpers = {};

export const key = 'MainMenuScene';

export function create() {
    const scene = sceneHelpers.getScene();
    const { setCurrentMapKey } = getSelectorData(selectMapSetters);
    const { setMenuItems, setMenuOnSelect } = getSelectorData(selectMenuSetters);
    const { setTextTexts } = getSelectorData(selectTextSetters);
    const gameHeight = getSelectorData(selectGameHeight);

    const handleMainMenuItemSelected = (itemKey, item) => {
        if (itemKey === 'start_game') {
            handleStartGameSelected();
        } else if (itemKey === 'settings') {
            setMenuItems(['controls', 'return']);
            setMenuOnSelect(handleSettingsItemSelected);
        } else {
            setMenuItems([]);
            setMenuOnSelect(null);
            window.location.reload();
        }
    };

    const handleSettingsItemSelected = (itemKey, item) => {
        if (itemKey === 'return') {
            setMenuItems(['start_game', 'settings', 'exit']);
            setMenuOnSelect(handleMainMenuItemSelected);
        } else {
            // controls
            setMenuItems([]);
            setMenuOnSelect(null);
            const textKeys = [
                UP_DIRECTION,
                DOWN_DIRECTION,
                LEFT_DIRECTION,
                RIGHT_DIRECTION,
                ACTION_KEY,
                ACTION_ITEM,
                ACTION_CANCEL,
            ];

            const handleChangeText = () => {
                const textKey = textKeys.shift();
                setTextTexts([{
                    // TODO move this to variables
                    key: `type_key_for_${textKey}`,
                    config: { top: Math.round(gameHeight / 2) },
                }]);
            };

            handleChangeText();
            scene.input.keyboard.on('keydown', () => {
                handleChangeText();
            });
        }
    };

    setMenuItems(['start_game', 'settings', 'exit']);
    setMenuOnSelect(handleMainMenuItemSelected);

    const handleStartGameSelected = () => {
        const testMapKey = 'test_map';
        setMenuItems([]);
        setMenuOnSelect(null);
        setCurrentMapKey(testMapKey);
        const {
            setHeroPreviousPosition,
            setHeroFacingDirection,
            setHeroInitialPosition,
            setHeroInitialFrame,
        } = getSelectorData(selectHeroSetters);

        setHeroFacingDirection(DOWN_DIRECTION);
        setHeroInitialFrame(
            IDLE_FRAME.replace(IDLE_FRAME_POSITION_KEY, DOWN_DIRECTION)
        );
        setHeroInitialPosition({ x: 19, y: 35 });
        setHeroPreviousPosition({ x: 19, y: 35 });

        changeScene(scene, 'GameScene', {
            // fonts: ['"Press Start 2P"'],
            atlases: ['hero', 'sword', 'bomb'],
            images: [],
            worldKey: 'test_world',
            // mapKey: testMapKey,
            // mapKey: 'sample_indoor',
        });
    };
}
