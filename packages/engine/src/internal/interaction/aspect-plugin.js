export default class AspectPlugin {

    static get name(){

        return 'AspectPlugin'
    }

    constructor(){

        this.attributes = {

            aspectRatioDisplay: {

                name: "aspectRatioDisplay",
                array: [],
                length: 1,
                defaultValue: 1
            }
        }
    }
}