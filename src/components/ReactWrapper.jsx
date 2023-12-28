import { useCallback, useMemo, useRef, useState } from 'react';
import { useResizeObserver } from 'beautiful-react-hooks';
import { animated, useSpring } from '@react-spring/web';

// Store
import { useGameStore } from '../zustand/store';

// Constants
import { OVERLAY_DIV_RESIZE_THRESHOLD } from '../constants';

// Hooks
import useMutationObserver from '../hooks/useMutationObserver';

// Utils
import { getSelectorData } from '../utils/utils';

// Components
import DialogBox from './DialogBox/DialogBox';
import GameMenu from './GameMenu/GameMenu';
import GameText from './GameText/GameText';
import HeadsUpDisplay from './HeadsUpDisplay/HeadsUpDisplay';

// Selectors
import {
    selectGameCanvasElement,
    selectGameFadeAnimation,
    selectGameSetters,
    selectGameShowHeadsUpDisplay,
} from '../zustand/game/selectGameData';
import { selectDialogMessages } from '../zustand/dialog/selectDialog';
import { selectMenuItems } from '../zustand/menu/selectMenu';
import { selectTexts } from '../zustand/text/selectText';

// Styles
import styles from './ReactWrapper.module.scss';

function ReactWrapper() {
    const canvas = useGameStore(selectGameCanvasElement);
    const dialogMessages = useGameStore(selectDialogMessages);
    const menuItems = useGameStore(selectMenuItems);
    const gameTexts = useGameStore(selectTexts);
    const showHeadsUpDisplay = useGameStore(selectGameShowHeadsUpDisplay);
    const fadeAnimation = useGameStore(selectGameFadeAnimation);
    const { setFadeAnimation } = getSelectorData(selectGameSetters);
    const pastFadeAnimation = useRef(null);

    const animationStyle = useCallback(() => {
        switch (fadeAnimation) {
            case 'left': {
                return {
                    marginLeft: '0%',
                    from: { marginLeft: '-100%' },
                };
            }
            case 'right': {
                return {
                    marginLeft: '0%',
                    from: { marginLeft: '100%' },
                };
            }
            case 'up': {
                return {
                    marginTop: '0%',
                    from: { marginTop: '-100%' },
                };
            }
            case 'down': {
                return {
                    marginTop: '0%',
                    from: { marginTop: '100%' },
                };
            }
            case 'reset': {
                switch (pastFadeAnimation.current) {
                    case 'left': {
                        return {
                            marginLeft: '-100%',
                            from: { marginLeft: '0%' },
                        };
                    }
                    case 'right': {
                        return {
                            marginLeft: '100%',
                            from: { marginLeft: '0%' },
                        };
                    }
                    case 'up': {
                        return {
                            marginTop: '-100%',
                            from: { marginTop: '0%' },
                        };
                    }
                    case 'down': {
                        return {
                            marginTop: '100%',
                            from: { marginTop: '0%' },
                        };
                    }
                    default: {
                        return {};
                    }
                }
            }
            default: {
                return {};
            }
        }
    }, [fadeAnimation]);

    console.log(fadeAnimation);

    const animation = useSpring({
        ...animationStyle(),
        ...fadeAnimation !== 'none' && { display: 'block' },
        ...fadeAnimation === 'none' && { display: 'none' },
        config: { duration: 1000 },
        onRest: () => {
            if (fadeAnimation === 'reset') {
                setFadeAnimation('none');
                pastFadeAnimation.current = null;
                return;
            }

            if (!['none', 'reset'].includes(fadeAnimation)) {
                setTimeout(() => {
                    pastFadeAnimation.current = fadeAnimation;
                    setFadeAnimation('reset');
                }, 500);
            }
        },
    });

    // const s = useGameStore((store) => store);
    // console.log(s);
    const ref = useMemo(() => ({ current: canvas }), [canvas]);
    const DOMRect = useResizeObserver(ref, OVERLAY_DIV_RESIZE_THRESHOLD);

    const [mutatedStyles, setMutatedStyles] = useState({});
    const defaultStyles = useMemo(() => ({
        // backgroundColor: '#fff',
        position: 'absolute',
        overflow: 'hidden',
        ...DOMRect,
    }), [DOMRect]);

    const mutationObserverCallback = useCallback((mutations) => {
        const { target } = mutations.at(0);

        setMutatedStyles({
            marginLeft: target?.style?.marginLeft,
            marginTop: target?.style?.marginTop,
        });
    }, []);

    useMutationObserver(ref, mutationObserverCallback);

    const inlineStyles = useMemo(() => ({
        marginLeft: canvas?.style?.marginLeft,
        marginTop: canvas?.style?.marginTop,
        ...defaultStyles,
        ...mutatedStyles,
    }), [canvas?.style?.marginLeft, canvas?.style?.marginTop, defaultStyles, mutatedStyles]);

    // const handleWrapperClicked = useCallback((event) => {
    //     const { clientX, clientY } = event;
    //
    //     canvas.dispatchEvent(new Event('click', {
    //         clientX,
    //         clientY,
    //     }));
    // }, [canvas]);

    // TODO maybe this is not needed anymore
    // console.log(defaultStyles, mutatedStyles);
    // console.log(mutatedStyles);

    return (
        <div
            style={inlineStyles}
            // onClick={handleWrapperClicked}
        >
            <animated.div style={animation} className={styles['fade-wrapper']} />
            {showHeadsUpDisplay && (
                <HeadsUpDisplay />
            )}
            <DialogBox show={dialogMessages.length > 0} />
            {menuItems.length > 0 && (
                <GameMenu />
            )}
            {gameTexts.length > 0 && gameTexts.map((text) => {
                const { key, variables, config } = text;

                return (
                    <GameText
                        key={key}
                        translationKey={key}
                        variables={variables}
                        config={config}
                    />
                );
            })}
            <button
                onClick={() => setFadeAnimation('down')}
                type="button"
            >
                Toggle Animation
            </button>
        </div>
    );
}

export default ReactWrapper;
