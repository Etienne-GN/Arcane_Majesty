// "Dress the model" (the Sculptor, docs/3d/characters/LAYERS_PLAN.md): a few basic outfits to judge a body by while it is
// shaped — painted onto the body's own surface (no cloth standing off it), so every point and every layer edit still
// lands, and the body can be edited dressed. Not the game's clothes: those come with the Forge on v2 (TODO §2, §4).
// Each is an outfit for buildBase (torso(y, θ, base), arm(part, y), leg(part, y), foot); y in the body's own frame.
const C = { shirt: '#c8b89a', vest: '#4a5a3a', trousers: '#3a3028', belt: '#2a1c12', boots: '#4a3020', robe: '#3a3a6a', robeTrim: '#c8a84a', dress: '#7a3040', apron: '#d8d0c0' };

export const DRESSES = {
    commoner: {   // a plain shirt, a belt, trousers, boots to mid-shin
        label: 'Shirt & trousers',
        torso: (y, th, base) => (y > 1.6 ? base : y < 1.03 ? C.trousers : y < 1.065 ? C.belt : C.shirt),
        arm: (part, y) => (part === 'upper' ? C.shirt : y > -0.16 ? C.shirt : null),
        leg: (part, y) => (part === 'thigh' ? C.trousers : y > -0.2 ? C.trousers : C.boots),
        foot: C.boots,
    },
    traveller: {   // a vest open over the shirt, long sleeves, boots to the knee
        label: 'Traveller',
        torso: (y, th, base) => (y > 1.6 ? base : y < 1.03 ? C.trousers : y < 1.065 ? C.belt : Math.abs(th) < 0.4 ? C.shirt : C.vest),
        arm: () => C.shirt,
        leg: (part, y) => (part === 'thigh' ? C.trousers : y > -0.04 ? C.trousers : C.boots),
        foot: C.boots,
    },
    robe: {   // a mage's robe to the ankles, long sleeves, a gold band at the waist
        label: 'Robe',
        torso: (y, th, base) => (y > 1.6 ? base : y < 1.065 && y > 1.035 ? C.robeTrim : C.robe),
        arm: () => C.robe,
        leg: (part, y) => (part === 'shin' && y < -0.4 ? C.robeTrim : C.robe),
        foot: C.boots,
    },
    dress: {   // a long dress with an apron at the front
        label: 'Dress',
        torso: (y, th, base) => (y > 1.6 ? base : y < 1.15 && Math.abs(th) < 0.7 ? C.apron : C.dress),
        arm: (part, y) => (part === 'upper' ? C.dress : y > -0.12 ? C.dress : null),
        leg: (part) => (part === 'thigh' ? C.dress : C.dress),
        foot: C.boots,
    },
};
