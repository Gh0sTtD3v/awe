import GridMesh from './grid-mesh'


class GridFactory {

    constructor() {

        this.isInit = false

        this._init = false

        this._instances = []
    }

    async preload() {
      
    }

    async get(parent) {

        if (this._isInit) {
            await this.initialisation
        }

        if (this._init == false) {
            this._init = true

            this._isInit = true

            this.initialisation = this.preload()

            await this.initialisation
        }

        const mesh = new GridMesh()
       
        if (parent != null) {
            
            parent.add(mesh)
        }


        return mesh
    }
}

export default new GridFactory()
