// Constants
import { DOWN_DIRECTION, IDLE_FRAME, IDLE_FRAME_POSITION_KEY } from '../../constants';

// Utils
import { changeScene } from '../../utils/sceneHelpers';
import { getSelectorData } from '../../utils/utils';

// Selectors
import { selectHeroSetters } from '../../zustand/hero/selectHeroData';
import { selectMapSetters } from '../../zustand/map/selectMapData';
import { selectMenuSetters } from '../../zustand/menu/selectMenu';

export const sceneHelpers = {};

export const key = 'MainMenuScene';

export function create() {
    const scene = sceneHelpers.getScene();
    const { setCurrentMapKey } = getSelectorData(selectMapSetters);
    const { setMenuItems, setMenuOnSelect } = getSelectorData(selectMenuSetters);

    setMenuItems(['start_game', 'exit']);
    setMenuOnSelect((itemKey, item) => {
        if (itemKey === 'start_game') {
            handleStartGameSelected();
        } else {
            setMenuItems([]);
            setMenuOnSelect(null);
            window.location.reload();
        }
    });

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
        setHeroInitialPosition({ x: 2, y: 3 });
        setHeroPreviousPosition({ x: 2, y: 3 });

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
