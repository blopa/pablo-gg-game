import { useEffect, useState } from 'react';
import { IntlProvider } from 'react-intl';

// Components
import ReactWrapper from './components/ReactWrapper';

// Selectors
import {
    selectGameZoom,
    selectGameWidth,
    selectGameHeight,
    selectGameLocale,
} from './zustand/game/selectGameData';

// Store
import { useGameStore } from './zustand/store';

// Constants
import { DEFAULT_LOCALE } from './constants';
import defaultMessages from './intl/en.json';

function Game() {
    const locale = useGameStore(selectGameLocale) || DEFAULT_LOCALE;
    const [messages, setMessages] = useState(defaultMessages);

    // Game
    const gameWidth = useGameStore(selectGameWidth);
    const gameHeight = useGameStore(selectGameHeight);
    const gameZoom = useGameStore(selectGameZoom);

    useEffect(() => {
        document.documentElement.style.setProperty('--game-zoom', gameZoom);
        document.documentElement.style.setProperty('--game-height', gameHeight);
        document.documentElement.style.setProperty('--game-width', gameWidth);
    }, [gameHeight, gameWidth, gameZoom]);

    useEffect(() => {
        async function loadMessages() {
            const module = await import(`./intl/${locale}.json`);
            setMessages(module.default);
        }

        if (locale !== DEFAULT_LOCALE) {
            loadMessages();
        }
    }, [locale]);

    return (
        <IntlProvider
            messages={messages}
            locale={locale}
            defaultLocale={DEFAULT_LOCALE}
        >
            <ReactWrapper />
        </IntlProvider>
    );
}

export default Game;
