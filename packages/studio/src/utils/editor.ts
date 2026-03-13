function isCurator(gameData, userId: string) {
    //
    return (
        gameData.editors.length && gameData.creatorId.toLowerCase() !== userId
    );
}

export function canChangeLock(gameData, lockedBy: string, userId: string) {
    //
    userId = userId.toLowerCase();

    if (isCurator(gameData, userId)) {
        //
        if (!lockedBy) {
            return true;
        }

        return lockedBy.toLowerCase() === userId;
    }

    return true;
}

const NotHiddeable = {
    background: true,
    postprocessing: true,
    envmap: true,
    lighting: true,
    "vrm-anims": true,
};

export function canShowHide(type: string) {
    return !NotHiddeable[type];
}
