export default class PictureWrapper {
    constructor(opts = {}) {
        this.atlas = opts.atlas;

        this.block = opts.block;

        this.loadID = -1;

        this.factory = this
    }

    load(url) {
        return new Promise((resolve, reject) => {
            this.loadID++;

            let _loadID = this.loadID;

            try {
                this.atlas.load(url).then((img) => {
                    if (_loadID != this.loadID) return;

                    this.remove(this.block);

                    this.block = this.atlas.addImage(img, url);

                    resolve();
                });
            } catch (e) {
                console.error(e);
            }
        });
    }

    get url() {
        return this.block.url;
    }

    set url(val) {
        this.load(val);

        // this.block.url = val
    }

    dispose(){

        this.atlas.remove( this.block )
    }

    remove(block) {
        if (block != null) {
            this.atlas.remove(block);
        }
    }
}
