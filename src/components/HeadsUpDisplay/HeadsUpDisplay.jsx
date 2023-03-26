import { useEffect } from 'react';
import classNames from 'classnames';

// Images
import healthCorner from '../../assets/images/hud_health_corner.png';
import healthMiddle from '../../assets/images/hud_health_middle.png';
import healthMeter from '../../assets/images/health_meter.png';
import manaCorner from '../../assets/images/hud_mana_corner.png';
import manaMiddle from '../../assets/images/hud_mana_middle.png';
import manaMeter from '../../assets/images/mana_meter.png';

// Styles
import styles from './HeadsUpDisplay.module.scss';

// Store
import { useGameStore } from '../../zustand/store';

// Selectors
import {
    selectHeroTotalMana,
    selectHeroTotalHealth,
    selectHeroCurrentMana,
    selectHeroCurrentHealth,
} from '../../zustand/hero/selectHeroData';

function HeadsUpDisplay() {
    const totalHealth = useGameStore(selectHeroTotalHealth);
    const currentHealth = useGameStore(selectHeroCurrentHealth);
    const totalMana = useGameStore(selectHeroTotalMana);
    const currentMana = useGameStore(selectHeroCurrentMana);

    useEffect(() => {
        if (totalHealth > 0) {
            document.documentElement.style.setProperty('--game-total-health', totalHealth);
            document.documentElement.style.setProperty('--game-current-health', currentHealth);
        }

        if (totalMana) {
            document.documentElement.style.setProperty('--game-total-mana', totalMana);
            document.documentElement.style.setProperty('--game-current-mana', currentMana);
        }
    }, [totalHealth, currentHealth, totalMana, currentMana]);

    return (
        <div className={styles['hud-wrapper']}>
            {totalHealth > 0 && (
                <div className={styles['hud-health-wrapper']}>
                    <img
                        src={healthCorner}
                        alt="nada"
                        className={classNames(styles['hud-image-corner'])}
                    />
                    <img
                        src={healthMeter}
                        alt="nada"
                        className={classNames(styles['hud-image-meter'], styles['hud-image-meter-health'])}
                    />
                    <img
                        src={healthMiddle}
                        alt="nada"
                        className={classNames(styles['hud-image-middle'], styles['hud-image-middle-health'])}
                    />
                    <img
                        src={healthCorner}
                        alt="nada"
                        className={classNames(styles['hud-image-corner'])}
                    />
                </div>
            )}
            {totalMana > 0 && (
                <div className={styles['hud-mana-wrapper']}>
                    <img
                        src={manaCorner}
                        alt="nada"
                        className={classNames(styles['hud-image-corner'])}
                    />
                    <img
                        src={manaMeter}
                        alt="nada"
                        className={classNames(styles['hud-image-meter'], styles['hud-image-meter-mana'])}
                    />
                    <img
                        src={manaMiddle}
                        alt="nada"
                        className={classNames(styles['hud-image-middle'], styles['hud-image-middle-mana'])}
                    />
                    <img
                        src={manaCorner}
                        alt="nada"
                        className={classNames(styles['hud-image-corner'])}
                    />
                </div>
            )}
        </div>
    );
}
export default HeadsUpDisplay;
