export const gradientColors = {
    pink: [
        {
            name: "pink-1",
            startColor: "#8E4D88",
            endColor: "#D66AA7",
            pos: 3,
        },
    ],
    yellow: [
        {
            name: "yellow-1",
            startColor: "#CC7B42",
            endColor: "#FABB5D",
            pos: 5,
        },
    ],
    red: [
        {
            name: "red-1",
            startColor: "#8E2732",
            endColor: "#E95E22",
            pos: 2,
        },
        {
            name: "red-2",
            startColor: "#ff3838",
            endColor: "#ff3838",
            pos: 6,
        },
    ],
    green: [
        {
            name: "green-1",
            startColor: "#27737D",
            endColor: "#60BE48",
            pos: 0,
        },
    ],
    blue: [
        {
            name: "blue-1",
            startColor: "#0365B4",
            endColor: "#3BA7C9",
            pos: 4,
            // level: 8,
        },
    ],
    purple: [
        {
            name: "purple-1",
            startColor: "#3A4E80",
            endColor: "#875FB2",
            pos: 1,
        },
    ],
    gray: [
        {
            name: "gray-1",
            startColor: "#353535",
            endColor: "#202020",
            pos: 7,
        },
    ],
};

// Gradients are all unlocked by default
// export const getUnlockedGradients = (level) => {
//     const unlockedItems = []
//     Object.keys(gradientColors).forEach((key, index) => {
//         for (let i = 0; i < gradientColors[key].length; i++) {
//             if (gradientColors[key][i].level === level) {
//                 unlockedItems.push(gradientColors[key][i])
//             }
//         }
//     })

//     return unlockedItems
// }

export const getGradientByName = (name) => {
    let gradient = gradientColors["purple"][0];

    if (!name) return gradient;
    Object.keys(gradientColors).forEach((key, index) => {
        for (let i = 0; i < gradientColors[key].length; i++) {
            if (gradientColors[key][i].name === name) {
                gradient = gradientColors[key][i];
                break;
            }
        }
    });

    return gradient;
};

export const createCssGradients = () => {
    if (!document.documentElement.querySelector("#gradientStyles")) {
        const gradientStyles = document.createElement("style");
        gradientStyles.id = "gradientStyles";

        Object.keys(gradientColors).forEach((key, index) => {
            for (let i = 0; i < gradientColors[key].length; i++) {
                const css = `.gradient-${key}-${
                    i + 1
                } {background: linear-gradient(180deg,${
                    gradientColors[key][i].endColor
                } 0%,${gradientColors[key][i].endColor} 100%);}`;
                gradientStyles.innerHTML += css;

                const uniqueColorCss = `.gradient-ucolor-${key}-${
                    i + 1
                } {color: ${gradientColors[key][i].endColor}}`;
                gradientStyles.innerHTML += uniqueColorCss;
            }
        });

        document.head.appendChild(gradientStyles);
    }
};
