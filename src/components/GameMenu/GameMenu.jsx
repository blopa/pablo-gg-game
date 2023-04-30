import { useCallback, useEffect, useState } from 'react';
import classNames from 'classnames';
import { FormattedMessage } from 'react-intl';

// Store
import { useGameStore } from '../../zustand/store';

// Constants
import { ARROW_DOWN_KEY, ARROW_UP_KEY, ENTER_KEY } from '../../constants';

// Selectors
import {
    selectMenuItems,
    selectMenuOnSelect,
    selectMenuPosition,
} from '../../zustand/menu/selectMenu';

// Utils
import { getTranslationVariables } from '../../utils/utils';

// Styles
import styles from './GameMenu.module.scss';

function GameMenu() {
    // Menu
    const position = useGameStore(selectMenuPosition);
    const items = useGameStore(selectMenuItems);
    const onSelected = useGameStore(selectMenuOnSelect);

    const [selectedItemIndex, setSelectedItemIndex] = useState(0);

    const handleOnSelect = useCallback((item, itemKey) => {
        setSelectedItemIndex(0);
        onSelected(item);
    }, [onSelected]);

    useEffect(() => {
        const handleKeyPressed = (e) => {
            switch (e.code) {
                case ENTER_KEY: {
                    handleOnSelect(items[selectedItemIndex]);
                    break;
                }

                case ARROW_UP_KEY: {
                    if (selectedItemIndex > 0) {
                        setSelectedItemIndex(
                            selectedItemIndex - 1
                        );
                    }

                    break;
                }

                case ARROW_DOWN_KEY: {
                    if (items.length - 1 > selectedItemIndex) {
                        setSelectedItemIndex(
                            selectedItemIndex + 1
                        );
                    }

                    break;
                }

                default: {
                    break;
                }
            }
        };
        window.addEventListener('keydown', handleKeyPressed);

        return () => {
            // TODO improve this
            console.log('rodei');
            window.removeEventListener('keydown', handleKeyPressed);
        };
    }, [handleOnSelect, items, selectedItemIndex]);

    return (
        <div
            className={classNames(styles['menu-wrapper'], {
                [styles['position-left']]: position === 'left',
                [styles['position-center']]: position === 'center',
                [styles['position-right']]: position === 'right',
            })}
        >
            <ul className={styles['menu-items-wrapper']}>
                {items.map((item, index) => {
                    const [itemKey, variables] = getTranslationVariables(item);

                    return (
                        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
                        <li
                            key={itemKey}
                            className={classNames(styles['menu-item'], {
                                [styles['selected-menu-item']]: selectedItemIndex === index,
                            })}
                            onMouseEnter={() => {
                                setSelectedItemIndex(index);
                            }}
                            onClick={() => {
                                handleOnSelect(item, itemKey);
                            }}
                        >
                            <FormattedMessage
                                id={itemKey}
                                values={variables}
                            />
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export default GameMenu;
