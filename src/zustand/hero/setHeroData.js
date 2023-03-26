export default (set) => ({
    setHeroFacingDirection: (facingDirection) =>
        set((state) => ({
            ...state,
            heroData: {
                ...state.heroData,
                facingDirection,
            },
        })),
    setHeroInitialPosition: (initialPosition) =>
        set((state) => ({
            ...state,
            heroData: {
                ...state.heroData,
                initialPosition,
            },
        })),
    setHeroPreviousPosition: (previousPosition) =>
        set((state) => ({
            ...state,
            heroData: {
                ...state.heroData,
                previousPosition,
            },
        })),
    setHeroInitialFrame: (initialFrame) =>
        set((state) => ({
            ...state,
            heroData: {
                ...state.heroData,
                initialFrame,
            },
        })),
    setHeroTotalHealth: (totalHealth) =>
        set((state) => ({
            ...state,
            heroData: {
                ...state.heroData,
                totalHealth,
            },
        })),
    setHeroCurrentHealth: (currentHealth) => {
        const newHealth = Math.max(0, currentHealth);
        set((state) => ({
            ...state,
            heroData: {
                ...state.heroData,
                currentHealth: newHealth,
            },
        }));

        return newHealth;
    },
    setHeroTotalMana: (totalMana) =>
        set((state) => ({
            ...state,
            heroData: {
                ...state.heroData,
                totalMana,
            },
        })),
    setHeroCurrentMana: (currentMana) => {
        const newMana = Math.max(0, currentMana);
        set((state) => ({
            ...state,
            heroData: {
                ...state.heroData,
                currentMana: newMana,
            },
        }));

        return newMana;
    },
});
