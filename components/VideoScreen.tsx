import { Vector3, Box3, Matrix4, PlaneGeometry, Group, Mesh, VideoTexture, ShaderMaterial, FrontSide } from 'three'
import { ScriptBehavior, Folder, Param, Components, UI, Player, Emitter, Events, Device, World, OOUI, $Param, GameClient } from '@oo/scripting'

const DEBUG = true;

export default class VideoScreen extends ScriptBehavior {
    static config = {
        transform: true,
        singleton: true
    }

    @Folder('Stream', {})
    @Param
    enableScreenshare = true
    
    @Param
    enableVoicechat = true

    @Folder('Volume', {})

    @Param({ name: 'Default volume', type: 'number', min: 0, max: 1, step: 0.01 })
    defaultVolume = 0.75

    @Folder('Videos', {})
    @Param({ name: 'Title', type: 'string' })
    title1 = ''

    @Param({ name: 'Video 1' })
    src1 = $Param.Resource("video")

    @Param({ name: 'Title', type: 'string' })
    title2 = ''

    @Param({ name: 'Video 2' })
    src2 = $Param.Resource("video")

    @Param({ name: 'Title', type: 'string' })
    title3 = ''

    @Param({ name: 'Video 3' })
    src3 = $Param.Resource("video")

    @Param({ name: 'Title', type: 'string' })
    title4 = ''

    @Param({ name: 'Video 4' })
    src4 = $Param.Resource("video")

    @Param({ name: 'Title', type: 'string' })
    title5 = ''

    @Param({ name: 'Video 5' })
    src5 = $Param.Resource("video")

    @Param({ name: 'Title', type: 'string' })
    title6 = ''

    @Param({ name: 'Video 6' })
    src6 = $Param.Resource("video")

    @Param({ name: 'Title', type: 'string' })
    title7 = ''

    @Param({ name: 'Video 7' })
    src7 = $Param.Resource("video")

    @Param({ name: 'Title', type: 'string' })
    title8 = ''

    @Param({ name: 'Video 8' })
    src8 = $Param.Resource("video")

    @Param({ name: 'Title', type: 'string' })
    title9 = ''

    @Param({ name: 'Video 9' })
    src9 = $Param.Resource("video")

    @Param({ name: 'Title', type: 'string' })
    title10 = ''
    
    @Param({ name: 'Video 10' })
    src10 = $Param.Resource("video")

    @Param({ name: 'Title', type: 'string' })
    title11 = ''    

    @Param({ name: 'Video 11' })
    src11 = $Param.Resource("video")

    n = 11;

    @Folder('Screen background', {})
    background = $Param.Component('mesh')
    
    private url: string = ''
    private index: number = -1

    private dimensions: Vector3 = new Vector3()
    private media
    private mediaType: string
    private isLoading: boolean = false
    private isPlaying: boolean = false
    private volume: number
    private muted: boolean = false
    private looping: string = 'once'

    private videoTexture
    
    private renderer = UI.createRenderer()
    private isShowingControls: boolean = false
    private isShowingList: boolean = false

    private multiplayer

    agora
    screenshare

    isReady: boolean = false
    isSharing: boolean = false

    onReady = async () => {
        this.volume = this.defaultVolume;
        this.setDimensions();
        this.multiplayer = GameClient;
        
        this.multiplayer.room.onMessage(async message => {
            const { type, data } = message.payload;
            switch(type) {
                case 'load-streamdeck':
                    this.url = data.url;
                    this.index = parseInt(data.index);
                    this.mediaType = data.mediaType;
                    this.volume = data.volume;
                    this.muted = data.muted;
                    this.looping = data.looping;
                                        
                    await this.removeMedia();
                    await this.addMedia();

                    this.video.currentTime = 0;
                    this.setVolume(this.volume);
                    
                    break

                case 'state-streamdeck':
                    if (this.isPlaying) return;

                    this.url = data.url;
                    this.mediaType = data.mediaType;
                    this.volume = data.volume;
                    this.muted = data.muted;
                    this.looping = data.looping;

                    if (!this.media) await this.addMedia();
                    
                    this.video.currentTime = data.currentTime;
                    this.setVolume(this.volume);
                    
                    break

                case 'update-timing-streamdeck':
                    if (!this.isPlaying || !this.media) return;
                    if (DEBUG) console.log("Updating time to: " + data.currentTime);
                    this.video.currentTime = data.currentTime;
                    
                    break

                case 'play-streamdeck':
                    // if (this.isPlaying) return
                    this.video.currentTime = data.currentTime;
                    this.isPlaying = true;
                    this.media.play();
                    console.log(this.media);
                    break

                case 'pause-streamdeck':
                    // if (!this.isPlaying) return
                    this.isPlaying = false;
                    this.media.pause();
                    
                    break

                case 'remove-streamdeck':
                    if (this.isSharing) {
                        
                    }
                    else if (this.index > 0) {
                        this.removeMedia();
                        // this.index = -1
                    }
                    break

                case 'request-streamdeck':
                    if (Player.isHost && this.url !== '')
                        this.multiplayer.room?.broadcast({
                            type: 'state-streamdeck',
                            data: {
                                url: this.url,
                                mediaType: this.mediaType,
                                volume: this.volume,
                                currentTime: this.video.currentTime,
                                muted: this.muted,
                                looping: this.looping
                            }
                        });
                    break

                case 'volume-streamdeck':
                    this.setVolume(data.volume);
                    break

                case 'muted-streamdeck':
                    this.setMuted(data.muted);
                    break
                
                case 'looping-streamdeck':
                    this.looping = data.looping;
                    if (this.video) {
                        this.video.loop = this.looping === "on";
                        if (this.isPlaying) {
                            this.media.pause();
                            setTimeout(() => {
                                this.media.play();
                            }, 1);
                        }
                    }
                    // if (DEBUG) 
                    console.log(this.video, this.looping);
                    break

                default: return
            }
        })
        
        this.addEvents();
        this.host.visible = false;
        this.background.visible = false;
    }

    onStart = async () => {        
        if (!Player.isHost) {
            this.multiplayer.room?.broadcast({
                type: 'request-streamdeck',
            });
            if (DEBUG) console.log("requesting streamdeck data");
        }
        
        if (this.enableScreenshare) {
            this.agora = await Components.create({
                type: "agora"
            });
            this.setupScreenShareEvents();
            if (DEBUG) console.log(this.agora);
            OOUI.showVoiceChat = this.enableVoicechat;
        }
    }

    onUpdate = async (dt: number) => {
        this.render();
        if (this.videoTexture) this.videoTexture.needsUpdate = true;
        if (!this.isReady && !!this.agora) this.isReady = true;
    }

    onDispose = () => {
        this.removeEvents();
        this.renderer.unmount();
        this.destroyScreenShareDisplay();
        if (this.agora) {
            this.agora.destroy();
        }
    }

    setupScreenShareEvents = () => {
        this.agora.on("screenshareVideoReady", async (e) => {
            this.isSharing = true;
            await this.createScreenShareDisplay(e);
        });

        this.agora.on("screenshareVideoEnded", (e) => {
            this.isSharing = false;
            this.destroyScreenShareDisplay();
        });

        this.agora.on("screenshareVideoAspectChanged", (e) => {
            this.updateScreenDimensions(e);
        });
    }

    render = () => {
        this.renderer.render(this.isShowingControls ? <>
            <Controls
                count={this.n}
                index={this.media ? this.index : -1}
                isPlaying={this.isPlaying}
                volume={this.volume}
                muted={this.muted}
                setMuted={() => {
                    this.multiplayer.room?.broadcast({
                        type: 'muted-streamdeck',
                        data: {
                            muted: !this.muted
                        }
                    })
                }}
                changeVolume={e => {
                    this.volume = e.target.value
                    this.multiplayer.room?.broadcast({
                        type: 'volume-streamdeck',
                        data: {
                            volume: this.volume,
                        },
                    })
                }}
                updateTiming={e => {
                    this.video.currentTime = parseFloat(e.target.value)
                    this.multiplayer.room?.broadcast({
                        type: 'update-timing-streamdeck',
                        data: {
                            currentTime: this.video.currentTime,
                        }
                    })
                }}
                onClose={() => {
                    this.renderer.render(null)
                    this.isShowingControls = false
                }}
                load={index => {
                    const src = this[`src${index}`].url
                    if (!src || src === '' || this.isSharing) return
                    if (this.isSharing) {
                        try {
                            this.agora.stopScreenshare()
                        } 
                        catch(error) {}
                    }
                    this.index = parseInt(index)
                    this.multiplayer.room?.broadcast({
                        type: 'load-streamdeck',
                        data: {
                            url: src,
                            index: index,
                            mediaType: 'video',
                            volume: this.volume,
                            muted: this.muted,
                            looping: this.looping
                        }
                    })
                    this.isShowingList = false
                }}
                play={() => {
                    this.multiplayer.room?.broadcast({
                        type: 'play-streamdeck',
                        data: {
                            currentTime: this.video.currentTime
                        }
                    })
                }}
                pause={() => {
                    this.multiplayer.room?.broadcast({
                        type: 'pause-streamdeck',
                    })
                }}
                remove={() => {
                    this.multiplayer.room?.broadcast({
                        type: 'remove-streamdeck',
                    })
                }}
                duration={this.video?.duration.toFixed(2)||1}
                currentTime={this.video?.currentTime.toFixed(2)||0}
                agoraReady={this.isReady}
                isSharing={this.isSharing}
                screenshare={() => {
                    if (this.isSharing) return
                    if (this.index > 0) this.multiplayer.room?.broadcast({
                        type: 'remove-streamdeck',
                    })
                    this.isShowingList = false
                    try {
                        this.agora.activateScreenshare()
                    }
                    catch(err) {
                        this.agora.destory()
                        this.agora = Components.create({
                            type: "agora"
                        })

                        this.setupScreenShareEvents()
                        this.agora.activateScreenshare()
                    }
                }}
                stopSharing={() => {
                    try {
                        this.agora.stopScreenshare()
                    } 
                    catch(error) {}
                }}
                videos={[...new Array(this.n).fill(0).map((_,i) => ({
                    title: this[`title${i+1}`],
                    url: this[`src${i+1}`].url
                }))]}
                isShowingList={this.isShowingList}
                setShowingList={() => {
                    this.isShowingList = !this.isShowingList
                }}
                setLooping={() => {
                    const looping = this.setLooping();
                    this.multiplayer.room?.broadcast({
                        type: 'looping-streamdeck',
                        data: { looping }
                    })
                }}
                looping={this.looping}
                previous={() => {
                    this.index--
                    if (this.index < 1) this.index = this.n
                    const src = this[`src${this.index}`].url
                    if (!src || src === '' || this.isSharing) return
                    this.multiplayer.room?.broadcast({
                        type: 'load-streamdeck',
                        data: {
                            url: src,
                            index: this.index,
                            mediaType: 'video',
                            volume: this.volume,
                            muted: this.muted,
                            looping: this.looping
                        }
                    })
                }}
                next={() => {
                    this.index++
                    if (this.index > this.n) this.index = 1
                    const src = this[`src${this.index}`].url
                    if (!src || src === '' || this.isSharing) return
                    this.multiplayer.room?.broadcast({
                        type: 'load-streamdeck',
                        data: {
                            url: src,
                            index: this.index,
                            mediaType: 'video',
                            volume: this.volume,
                            muted: this.muted,
                            looping: this.looping
                        }
                    })
                }}
            />
        </> : null);
    }

    addMedia = async () => {
        if (this.isLoading || this.url === '') return;
        this.isLoading = true;
        this.background.visible = true;
        try {
            this.media = await this._mediaFactory({
                url: this.url,
                contentType: this.mediaType,
                position: {
                    x: this.host.position.x,
                    y: this.host.position.y,
                    z: this.host.position.z
                },
                rotation: {
                    x: this.host.rotation.x,
                    y: this.host.rotation.y,
                    z: this.host.rotation.z
                },
                scale: {
                    x: this.dimensions.y,
                    y: this.dimensions.y,
                    z: 0.02,
                },
            });
            this.media.data.audioType = 'global';
            this.video.loop = this.looping === "on";
            this.video.onended = () => {
                if (this.looping === "once") {
                    this.index++;
                    console.log(this.index)
                    if (this.index >= this.n + 1) {
                        this.index = 1;
                    }
                    const src = this[`src${this.index}`];
                    if (!src || src === '') {
                        console.log("No video found");   
                        return;
                    }
                    this.multiplayer.room?.broadcast({
                        type: 'load-streamdeck',
                        data: {
                            url: src.url,
                            index: this.index,
                            mediaType: 'video',
                            volume: this.volume,
                            looping: this.looping
                        }
                    });
                }
                if (this.looping === "off") {
                    this.isPlaying = false;
                    this.background.visible = false;
                }
            }
            this.isLoading = false;
            this.isPlaying = true;
        }
        catch(err) {
            console.log(err);
            this.isLoading = false;
            this.background.visible = false;;
        }
    }

    setVolume = (volume: number) => {
        this.media.volume = volume
        if (!this.isPlaying) setTimeout(() => {
            this.media.pause()
        }, 10)
    }

    setMuted = (muted: boolean) => {
        if (this.muted !== muted) {
            this.muted = muted
            this.media.muted = this.muted 
        }
    }

    setLooping = () => {
        switch (this.looping) {
            case "off":
                return "on"
            
            case "on":
                return "once"

            default:
                return "off"
        }
    }

    get video() {
        return this.media?.['_video']?.videoData?.video || null
    }

    removeMedia = async () => await new Promise(resolve => {
        try {
            if (DEBUG) console.log(Components.byName(`streamdeck-${this.host.name}`));
            Components.byName(`streamdeck-${this.host.name}`).forEach(c => {
                c.destroy();
            });
            this.background.visible = false;
            // this.index = -1
            resolve(null);
        }
        catch(error) {
            console.log(error)
            resolve(null)
        }
    })

    setDimensions = () => {
        const c = this.media
        if (c) {
            const obb = new Box3().setFromCenterAndSize(c.position, c.getDimensions(new Vector3()))
            const matrix = new Matrix4().makeRotationFromQuaternion(c.quaternion)
            obb.applyMatrix4(matrix)
            const dimensions = obb.getSize(new Vector3())
            if (DEBUG) console.log(dimensions)
            const aspectRatio = dimensions.y / dimensions.x
            this.host.scale.set(
                this.host.scale.x,
                this.host.scale.x * aspectRatio,
                0.02,
            )
        }
        const obb = new Box3().setFromCenterAndSize(this.host.position, this.host.getDimensions(new Vector3()))
        const matrix = new Matrix4().makeRotationFromQuaternion(this.host.quaternion)
        obb.applyMatrix4(matrix)
        
        this.dimensions = obb.getSize(new Vector3()) 
    }

    _mediaFactory = async ({ url, contentType, position, rotation, scale }) => await Components.create({
        url,
        type: contentType,
        name: `streamdeck-${this.host.name}`,
        position: { x: position.x, y: position.y, z: position.z },
        rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
        scale: { x: scale.x, y: scale.y, z: scale.z },
    }, {
        transient: true,
    })

    createScreenShareDisplay = async (e) => {
        if (this.screenshare) {
            this.destroyScreenShareDisplay();
        }
        this.videoTexture = new VideoTexture(e.video);
        this.videoTexture.needsUpdate = true;  // Ensure texture updates
        
        const aspect = e.videoDimensions[0] / e.videoDimensions[1];

        const material = new ShaderMaterial({
            transparent: true,
            side: FrontSide,
            uniforms: {
                videoAspect: { value: aspect },
                planeAspect: { value: 1 },
                map: { value: this.videoTexture }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                float remap(float x, vec2 from, vec2 to) {
                    return ((x - from.x) * (to.y - to.x) / (from.y - from.x)) + to.x;
                }
                uniform sampler2D map;
                uniform float videoAspect;
                uniform float planeAspect;
                varying vec2 vUv;
                void main() {
                    vec2 uv = vUv;
                    float pad = (planeAspect - videoAspect) * 0.5;
                    vec2 from = vec2(0., 1.);
                    vec4 col = vec4(0., 0.0, 0.0, 1.0);
                    if (pad > 0.) {
                        vec2 to = vec2(-pad, 1. + pad);
                        uv.x = remap(uv.x, from, to);
                        if (uv.x >= 0. && uv.x <= 1.) {
                            col = texture2D(map, uv);
                        }
                    }
                    else if (pad < 0.) {
                        vec2 to = vec2(pad, 1. - pad);
                        uv.y = remap(uv.y, from, to);
                        if (uv.y >= 0. && uv.y <= 1.) {
                            col = texture2D(map, uv);
                        }
                    }
                    else {
                        col = texture2D(map, uv);
                    }
                    gl_FragColor = col;
                }
            `
        });

        const geometry = new PlaneGeometry(1, 1);
        const screenGroup = new Group();
        const mesh = new Mesh(geometry, material);
        
        mesh.scale.set(
            this.dimensions.x,
            this.dimensions.x / aspect,
            1
        );

        material.uniforms.planeAspect.value = mesh.scale.x / mesh.scale.y;
        
        // Position the screen at the host position
        screenGroup.position.set(
            this.host.position.x,
            this.host.position.y,
            this.host.position.z - 0.01   
        );
        screenGroup.rotation.copy(this.host.rotation);

        screenGroup.add(mesh);
        this.screenshare = screenGroup;

        console.log(this.screenshare)

        World.add(this.screenshare);
    }

    updateScreenDimensions = (e) => {
        if (!this.screenshare) return;
        const mesh = this.screenshare.children[0]
        const aspect = e.videoDimensions[0] / e.videoDimensions[1];
        
        mesh.scale.set(
            this.dimensions.x,
            this.dimensions.x / aspect,
            1
        );
        mesh.material.uniforms.videoAspect.value = aspect;
        mesh.material.uniforms.planeAspect.value = mesh.scale.x / mesh.scale.y;
    }

    destroyScreenShareDisplay = () => {
        if (this.screenshare) {
            World.remove(this.screenshare);
            this.screenshare = null;
        }
    }

    onKeyDown = (e) => {
        if (e.ctrlKey && e.code === 'KeyQ') {
            this.isShowingControls = !this.isShowingControls;
            if (this.isShowingControls && !Device.isTouch) {
                document.exitPointerLock();
            }
        }
        if (!this.agora) return;
        if (e.code === "KeyU") {
            this.agora.activateVoice();
        } 
        else if (e.code === "KeyM") {
            this.agora.disableVoice();
        }
    }

    addEvents = () => {
        Emitter.on(Events.KEY_DOWN, this.onKeyDown);
    }

    removeEvents = () => {
        Emitter.off(Events.KEY_DOWN, this.onKeyDown);
    }
}

const Controls = props => {    
    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    return (<>
        <div className="control-modal">
            <div className="control-content">
                {props.isShowingList ? props.videos.map((video,i) => (<>
                    <div className={`video-opt${(i + 1).toFixed(0) === props.index ?' active':''}`} onClick={() => {
                        props.load(i+1)
                    }}>
                        <div className="video-index">
                            {i + 1}
                        </div>
                        <div className="video-info">
                            <div className="video-title">
                                {video.title}
                            </div>
                            <div className="video-subtitle">
                                {video.url}
                            </div>
                        </div>
                        <div className="video-menu">
                            <img className="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAABkklEQVR4nO3ZIUxWURTA8YuDuQGbgUCwGKSYbMysDSJULGIl2hhNYRB1o9qkwtxsJBqJoEULgcCcG7gBTvyxt71ve1w+TfeTe7f7b+9t77zz33vvvHPPDaFSqVQq/wtMYA0fsYrJUAoYwxfX+Y7noQSw4O98woOQM1iOkj6Ljk+xhDshR7DSSfYdRrGO35HIHh6FzAVWOucfYz+S+IU3uBtyF2jAMF7hPBI5wHTIXaAHHmI3krjEJsZD7gINGMJLnEQi3/As5C7QoymrbXmN2Wp+iCF3gR6Yx3EkcYS5UIJAe+0k3vd5Gtu4P7isEwl0YsziMJL40X4zQ+mzTizQxrnXVqU/kUhTvabSZj0AgU68p/japx1ZTJPxgAXamKPY6NOOzKaIP3CBHniCi078rVC4wIeU8W/jFZpJEf+2PuIXaTK+ecNaRpX6I1NyK6HUZk6p7bSSFzSYKnJJiZFiF/UKHau8/UcbkO1ga7mTZLMY+VnaaHFB4cPdMXwudrze2eBoNjZ28LqoDY5KpVKphD5cARSKRq26mAUjAAAAAElFTkSuQmCC" alt="play" /> 
                        </div>
                    </div>
                </>)) : null}
                {props.agoraReady && props.isShowingList ? <>
                    <div className={`video-opt${props.isSharing ?' active':''}`} onClick={props.screenshare}>
                        <div className="video-index">
                            <img className="small-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAAA+0lEQVR4nO2ZQQ6CQBAE+Qd4U/9OCCf1V5qIHyiDmQOXPTgzK2vSdd3Qnd6ZhA50nRBC/C3AAEzAi/qsHjNwqhHiwe9ZPfvMIJMJX1KFy349cDXPMVP4ZaLVQ2w8D+b5zBT9kCa4ly/Zgnv5oiAxNJESWq0gWq0aN9NUR8MZpLmOhj9IWx0Nf5C2Ohr+IK7nolDyVRBDE3FC6QK9N6uJVJzIYmdDiuCOQWY7u34TpsUgZ+COk2aCbF7/42bN/jOIBwUJgiZSQKsVBK1WAa1Wg6u1eDpai78jZk9HC/gNwM08p0zhUEcLfg46pgWJdjQHi32Cyg0hhBDdL3kDGTXhuNynM8cAAAAASUVORK5CYII=" alt="screensharing" />
                        </div>
                        <div className="video-info">
                            <div className="video-title">
                                {props.isSharing ? 'Sharing screen' : 'Start screenshare'}
                            </div>
                        </div>
                        <div className="video-menu"></div>
                    </div>
                </> : null}
                {/*<div className="media">
                    <input type="text" placeholder="Enter URL" onChange={e => {
                        this.src12 = e.target.value
                    }} />
                    <input type="button" value={`Load custom`} onClick={() => {
                        props.load(12)
                    }} />
                </div>*/}
            </div>
            <div className="control-active" onClick={props.setShowingList}>
                <div className="video-opt-active">
                    <div className="video-index">
                        {props.isSharing ? <img className="small-icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAAA+0lEQVR4nO2ZQQ6CQBAE+Qd4U/9OCCf1V5qIHyiDmQOXPTgzK2vSdd3Qnd6ZhA50nRBC/C3AAEzAi/qsHjNwqhHiwe9ZPfvMIJMJX1KFy349cDXPMVP4ZaLVQ2w8D+b5zBT9kCa4ly/Zgnv5oiAxNJESWq0gWq0aN9NUR8MZpLmOhj9IWx0Nf5C2Ohr+IK7nolDyVRBDE3FC6QK9N6uJVJzIYmdDiuCOQWY7u34TpsUgZ+COk2aCbF7/42bN/jOIBwUJgiZSQKsVBK1WAa1Wg6u1eDpai78jZk9HC/gNwM08p0zhUEcLfg46pgWJdjQHi32Cyg0hhBDdL3kDGTXhuNynM8cAAAAASUVORK5CYII=" alt="screensharing" /> 
                             : props.index > 0 ? props.index : '...'}
                    </div>
                    <div className="video-info">
                        <div className="video-title">
                            {props.isSharing ? <span className="dot">Sharing screen</span> : props.index > 0 ? props.videos[props.index-1].title : 'No source selected'}
                        </div>
                        <div className="video-subtitle">
                            {/** */}
                        </div>
                    </div>
                    <button className="video-select-btn">
                        Select
                    </button>
                </div>
            </div>
            <div className="control-video">
                <div className="control-buttons">
                    <button disabled={props.isSharing || props.index < 0} onClick={props.previous}>
                        <img className="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAB50lEQVR4nO3azY4MURjG8RIWI4iVndn7WFmwtzNxByRugbgC98DWJGLDXlwACSsJOxYkBhMWVoyFDL/JjJqku7Tp+jh1qke9//VJ/59+clJdfc5bFEEQBEEQBEEQjBpcxkd8wErCzz2LVbzBD3zBI1zBwVSeCd8Z3MVrbOBzLZ8/X3yXtQRBDuMONv2b5zjZ1VX6lnC7tU+FjmFO45V6bK870tF3qrNPogJwDd804+bgPh0LwDHc144XLXxHk/p0KADnyodcW74P7tOygHILbj/dOzG4T8NAOI6HXYMsjE+DQLiAd6nC1PS97dWnRiAcwHX8TBlmIXzmLMAJPE4dZFF8xV4LcBHrfYUZ2rfDrAU4hFv41WeYoXxTzFizjKd9BxnKV6eAr7nCDOGrU8B/TRRQxciIAqoYGVFAFSMjCqhiZEQBVfzN6F+Fl/Ek467M6pu7A4rpv6ebOQLl9k1R44DiU65AuX07zFsw6iOxXUZ9KDoJzvd+TJ3bp0GgiYuKB70Fyu3TMFDlqmojeaDcPi0DFWO/HO3tuno/XY8nGFi4UQztk6iAFiMrLzOPyMz2ST8ktVQOSf3eI8yzxENS7X1YKUtYw6UUoSZ+w+/hfflCs16+4V3taUwuqy8IgiAIgiAIgmJfsgXwAxzfx9io5wAAAABJRU5ErkJggg==" alt="external-music-music-player-button-solid-adri-ansyah-26" />
                    </button>
                    {!props.isPlaying && !props.isSharing ? <>
                        <button onClick={props.play} disabled={props.isSharing || props.index < 0}>
                            <img className="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAABkklEQVR4nO3ZIUxWURTA8YuDuQGbgUCwGKSYbMysDSJULGIl2hhNYRB1o9qkwtxsJBqJoEULgcCcG7gBTvyxt71ve1w+TfeTe7f7b+9t77zz33vvvHPPDaFSqVQq/wtMYA0fsYrJUAoYwxfX+Y7noQSw4O98woOQM1iOkj6Ljk+xhDshR7DSSfYdRrGO35HIHh6FzAVWOucfYz+S+IU3uBtyF2jAMF7hPBI5wHTIXaAHHmI3krjEJsZD7gINGMJLnEQi3/As5C7QoymrbXmN2Wp+iCF3gR6Yx3EkcYS5UIJAe+0k3vd5Gtu4P7isEwl0YsziMJL40X4zQ+mzTizQxrnXVqU/kUhTvabSZj0AgU68p/japx1ZTJPxgAXamKPY6NOOzKaIP3CBHniCi078rVC4wIeU8W/jFZpJEf+2PuIXaTK+ecNaRpX6I1NyK6HUZk6p7bSSFzSYKnJJiZFiF/UKHau8/UcbkO1ga7mTZLMY+VnaaHFB4cPdMXwudrze2eBoNjZ28LqoDY5KpVKphD5cARSKRq26mAUjAAAAAElFTkSuQmCC" alt="play" />
                        </button>
                    </> : <>
                        <button onClick={() => {
                            props.isSharing ? props.stopSharing() : props.pause()
                        }} disabled={props.isSharing || props.index < 0}>
                            <img className="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAABMUlEQVR4nO2ZO0pDURRF3zT8RBs1ovMwTkDidPwUfgqNhZ+BxDafMlpmIkZBrVZ4cAWREM7ZokXYC267Dpu7u11VxhhTA6wDl8AAeJ7xhkAH2KqSAE3gpjhmueubF8Ba1v3z0D7wRowPoJ1wHwKfQfcr0FJDrBZBhjrMdsC9mwjxxQRYVoKconEXcD+I7mMlyKN4bBRwP4nurhKkJx4bB9xj0d1zEAH/SABXS8HVCuBqKbhaAVwtBVcrgKul4GoFcLUUXK0ArpaCqxXA1VJwtQK4WgquVgBXayGq1f3DWWH0n7PCiXjsNuC+F91HSpCVMndlp7dmwL0jTG8vwFI6SDnYSuyI78BBwt0uwSNMgD0pxLeDDeAc6M+Zp6+ADcG9CVzPmaf7wFk9zP4qhDGmWhimx+4SpkA0eZ0AAAAASUVORK5CYII=" alt="pause" />
                        </button>
                    </>}
                    <button disabled={props.isSharing || props.index < 0} onClick={props.next}>
                        <img className="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAABnklEQVR4nO3asUoDQRSF4VURLFLZWVjYiZ1g6QMoPoH4EBZi7yuIljbiCwQsrFJrGkUbsXQVUcEyEozml4Es6JA4Zje5mzDnqxfOzUmKzcxNEhERERERkSRJgClgEzgFnoEGcAscAUvjmgdsAI/AA7De66F54JzePoEDYGZAQ5nldT54Ju32QAW44X+ugcWCA1nn/dLtgV368w5sFxjIOi9YwBX5nLhvM8dA1nnBAhrkdwcs9zmQdV6wgKKa7icKTOQZyDpvGANlqsCsQQGF8oY5kJMCq0YF5Mob9kBOC9gDJg0K6DvPYqBMDZgbtTzLApxXYG2U8qwLcNrAPjA9CnllFJCpAwuUnFdmAc4bJeeVXUDpVICPyKgAH5FRAT4iowJ8REYF+LAV9atwPdY/Q+2Y/w6/GB+IBPMsC6jFeiTWivlQNI35WLwa68VIc9yvxhqxX45eGl9XW+cFC9gxXliwzgsWUIl6RebH0tLFH4N8AYcDXpIyyQsuSXlra1vAGfAEfAD3wDGwkgyYVZ5bjeuUkPqvySIiIiIikkTnGwrOKv1yVlv9AAAAAElFTkSuQmCC" alt="external-music-music-player-button-solid-adri-ansyah-5" />
                    </button>
                    <button onClick={props.setLooping}>
                        {props.looping === "off" ? <>
                            <img id="repeat_off" className="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAACB0lEQVR4nO3YPUsDMRzH8UJpHXSxb6Krgy4+gS+iq2AHB/FdtN1tB0EQl4KbKIqrgxUpqFREfAPi6qC4uHzlMMI1nJpL/skd5X5wdMn9k0/vIcmVSkWKFEkVYBm4ArpApRQwQBloA9fq175/VeQnxyExQJPxHFn3D/S0YsEwQEfr2x4DVIGTLDBAHXiXxFTU4OM5B6a8CMb7XgLeCkyK22wA7AU4bhOuivgzk3XapoOfB2ZzjBmaIKaBF3Vp84ppmUC2YyeYYD6Bg9w9I8CZduJu6HkGWHWeT4CRdvJ6QhtvGCQQqtCjVqDxSztxDIYzu+mtZQTxgcFgrQXUgL4oRBrDP6tfhbiLxigOkcTwx34khsAbRBKTFA3hF+Jz1Qw0tJp+Ib4wZAHxgSEriDSGLCGSGLKGSGEQgESvvJoLROLVjCNkDKH+2fhkVQ6FwQGShIiWC/E000BcMFhC+gaIKJ20EFsMlpCKASJaatdtIDYYbCCGiBVbhA0G2NDajXKBSIPheywXWptTF0SUG4GPCj2DDxoD1XYfeEoYx5YJJHq1+o7Lp6ZnYMYEMiRMbDCvwMK/CFWwRbikwTwAc0aIQM+Ifmxq/VcTMPdWWwC1dz5MgHwAa6kLZrmfYcIwFR8zu8A8U7UpJrrWEsJ0bYuJrH4FMZcuxZz2I0KYnQgBLIbsu0iR0gTkCxPAjjVjHNjrAAAAAElFTkSuQmCC" alt="no-repeat" />
                        </> : props.looping === "once" ? <>
                            <img id="repat_one" className="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAAB4klEQVR4nO2ZOy8EURSAb7DiEYVNlCoKoVIoxCPxI7bQ0QnhD4hCdsUrEhIKicomOiIKlahXGCQeUSv8AEL7yY0p1s2MOXbsZO66X7LdnLPn2/s4d+4q5XA4rAFoBLaAG2AZyCgbAeb4zqGVMsCGIWKnDNAHvNWKzBDw6mSCAOqAMWAB2AF2E/xcBYzK76cZMADckU4KUokR4IP0UpJItAIvpJu8RGQmIPAB2LNqjQAnRuAZ0KASBBiN3U/8c045E1Wv/K8lNMC9kSCnYgC0AcNAs+DZbomEdGrFFtFFA+PAUdnudyGI2xRIZIFi1UX0lwKPBJONiJ0WSHi6xiREOgmnQ/AjrPk71mKIBImI+DlWgCdg/zciYRgSyYkYzfUvRHJGHidSEW5EDNzUogYXuxfVxGwQ8col/GalL81u/aNEow0iXoCEPi6UMyvI1WTEtCcpUhRIaNaFRZz6z59XIhFHJCOQ0Eft3shkXznqgZ44L2dUIiKUGFEJAkwaNVzbKJHR09Ko4ziOhOYy4QuIvZB3mymJSIF08wy0SERKpJd3YFA6J/Okk2ugXySRwjWyDcz7V0R1Yglj7z8IGdoxZRPUmEzmh37SpWpEZknZBsEy0U0pxTKL/uXZqnX/sjoc/5xPL2gQ0XhIP30AAAAASUVORK5CYII=" alt="repeat-one" />
                        </> : <>
                            <img id="repeat" className="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAABnElEQVR4nO3ZPUoDQRiA4SG6KbTzClppZWEhEiGHSK+dKHoBsQiJiIqgoIWQLmAniLVYBzRR8OcAKTyAou0rA1tsho1+kmTzTZwXUu4yDzu7M0yMCYVC3gTkgRPgAdgDIuNjwBadXXqJAY4ciJ8YYA74GBXMEvAeMGkBOaAI7ABnwHmGv/uUp/L3aQYsAE/orCpFFIAv9NaQICaBN3RXkUA2Ui58AWpevSPAtXPhDTBuMgxY7nk9ifc5yVYGPvJ+I2zAs3ODkskoYEaCkE6tYUKOBYgpoK4dsi5ANO0YtUMi4CD+YpW7IFAP6ZaD8BpScsYUIEON8EQ6C++IpqnVtJ8+4zmkmUTEi5U9NHuMtxL5QQP6AUlD2O1Csk2jHFIXIGyHgwb0CokECLvVnjWaIUJEwWQYsOqMoeUjIgJunXFc9YKw3WV8AFEDXlPGsSaBVNFdG5iQQBro7RNYlM7JCjprAfMihMJ35BTYjo+IcmJEAjMGXHR5tEXjU4wYJvphPZk2I4LZNb5FOub3RUkxphwfnu179y9rKPTP+waoBuTEnzavAwAAAABJRU5ErkJggg==" alt="repeat" />
                        </>}
                    </button>
                    <button className="control-volume">
                        {props.muted ? <>
                            <img
                                className="icon"
                                src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAAEbElEQVR4nN2aW4hWVRTHz2jhjWKaKe1idLOil4qCLKIrlFFoWtSLBNZL9iBYYWAQFFREVARBUdAFw5B6SrCLZVSMWtaMo1kTZSpSRhe60QUp+sVq/kd2n2uf2+zv1LRg+L45/7X3Ob99XWufLwPeADYAfdl4NmCAURsc1zBAL7BJMJuB/my8GtCnHknSM8BU4GHgc2APcFu6p20JBjgMGGZ/uzYbLzCMQmxV+beAE4Eb9f8L3XvyhDDAocAWlXvdhpeun5HXVaWeoEFOy9qGEcRwJ4S00/OFpMb9H1WZ1cBxrcDYKhdAvAZM6dCbgMwHflU5+1zc1aVZ+nvS13ZCNAUxA2YCK4LFYoVX/5hhOiBejd2kKUhuwMKgd6yxJmUJh9ksYKgMIgWIGXAW8I3qeR6YmCWC+V2frwCTS8qVggAHqa6HgIMjPmcCP6iuexqDODDW3UdWKFMF5ARgr/wsGjgv4ncR8If+LmgKMR2Y0GBprjS0NHy2yNegFkb87pbPztrzBZgBfAI8AfTUgakzR4DJwEr5W6vPd3wODKKHpZ0tvQr4nnJbl8+JGvtMrcnOaEM9rTI/Ayc5PvOkfwVMyy9aYkVFiH07dlWYhhviAcDbKmdJX4/jky/91+UXzL4FDo+EHmY/7iPf36cQxgNRMHk/MNfmXaTeY9UjZlc7+mJpa0MQt7UscJM+HGm8UpgIyJKgp61lZ0XqvVc+myKh0V7Npb4ykDoT1YWJgEwBbgY+k/a19VLmLzL5nnWyo6+XNicZSAymqA4BvRj0zATHxzZKs1sdzbJQszuSgkRgLi65h8Hsls+Vjn67tFWOtkjas8lBHJgvy+qw1pbPU442N28UR7tC2ktdAXFgykDyXhtwtHOk7SjQ3ukaiAOzp2DTvEw+6xxttrSdjna2tA1dBamxad4l/bGC4TPkaHOkvdx1kDIY7Qe2IZtd6JRdVjDZr5f2TBs9MjUWNeu0ZKOuvRkpv0b6LY72oLRlbYBYHU86MCPAd/q+OxIi9QO/VdgQLy0DObVKiFIBxOyRyGpmQeuMSNnl8lkfiQMtPPnl71RbjjZGj3Cc7aZmP1m4P0aQzTUXgOlBarHA0W+Stjq/YOF5FfugCUxseJYsAD06nCuaO9ukzwvJn6uYWG2LDYO6IEUwwANB+nC8U+6qIN2d2PRw+sM6MGULhgPzuL5b1Hu54z8J2P6PpKqOCSY/HPjIW2WagDgwKM+4JuKbR7zvxpKyujAj3gLRBMSBGYksAAuAP7VSndIIIvL64OOys60UyZkZcH5wdHpDlsKAQ4D3VakdEx1V4Fs3OevtPGu2DU8T3+zOJBCRdyIGMzMFiNMz24N0976sG6bWslYz+xQ4ukvJmdnypA/v3DB8vbCr8w3TGJOz3lZfnRfBJEjOetuG6Q/emewAjtH1c3Vt43/ldwBVbzgU9Mzs4BRkZYK6B9uGyYdZaJckqnuwTZhpln8AXyhpWpKw7r5WYbpp/I9/CDTwbz/PmEwwliqv+QuKPwRv9r2FTQAAAABJRU5ErkJggg=="
                                alt="no-audio--v1"
                                onClick={props.setMuted}
                            />
                        </> : <>
                            <img
                                className="icon"
                                src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAACXBIWXMAAAsTAAALEwEAmpwYAAADr0lEQVR4nO2ZX2hOYRzHz8xm8y+mKEx2If/mUoq2Rv6MQrtyIxfKEnJBErIii9oUS0rKxfwZYSHJ5IIiudgI+RfZRpgZhTYMHz3b76zT+z7nvOc573v27q33e/ee3+/5nedznn+/5/daVlpppY6ATGAn0Ax8BY4CWVYqCcgGLhGtSivFIC5Lxz8BC4E58rvVSlGIWfJ8kDz7axhvcmid9QnRBhRG2HtkEG+jNLkBTAul06YQAUFmSyyl30CFGtmEd95lYbfZ0yleECVgFHAY6Jbm14DRVj+MxEwPX2MQW0CxY3QeAnlWSBAfvSDiBVECJgKPJMx9YKQVAsQMH208QSTmTaAOyHfxGQc8l1BqOmf0K4RPkBHAZ3H7Bqxy8csH2sVvU79C+AERn0nAFXH9B+xw8Vsu9i6gIB6ID8B0w/a+1wiwTR2eXl8dOCH2k86HubLNfSG2jCFMQZSAdfLV/wBzLf3i7xTg3i0fqPEBEBgiCIgSUCXNXgFDrAgBh8R+xH7QIQ8WRzqLvVXs86yAigQBhgH7gDVqRnhM5yfSdLPGXig2tUlk970EyHEJqIaYeFIEDch8x3tbgBKXdivF563u/UCj2Ev9gBhPCx8gKiNeCzxz5FNLNO0ygNfis0Bj3y+2vUkBibhJHnOk/mM0PpVir9bYysTWkFQQx1e/Iy4VGnup2G5rbAX29Ew6iNiXiUuTy1ar9E5jGy627wMFZKy4/NDY1Dmn1OnS9mdP7DRIOFOr0SVRHPhTSxb7XXHZrbEvFdstj8XePBC23+OO7TfPY/ut8th+ryfzQCx3XJR+AYtiHIhRpz9wQGx7BkKK8gYoipGitLikKE3OFMVOGktjJI3FCQTJlaRxtS6z1SSNUfcSlb6Lrd1OGtVdxI/6qoemCjI9gWpp9tIljbf7XWM/yJHcviMsmDguVt2qduyyJXfJxSqqIGhc1w0DBNgqN0Ol8hhX3VqTfuiqikYwfkCACY746ktvcfFb4Sg+BCt0C0y9KUwsEDlPVGUG+WOozKPSYpeDNgSCcATLAi6awPgckVPAaWC8R4HuhYSqj4chEuaCX5ggu5ZmcT+WMPdUQc9KlATmvB+YeECAEkcR+0FYFflMmRKeMAn6W+GqepawzmteOBg45wUT4BwpdoyCysN2xVW0NoQ56wYTAKRCmjQAU0PpdAyYukgYYKj9ZQ1jTQm1wz7WzBkHTJHj9vfUSiXRC1NLtLZbqSZ6L0Tr1SgA74GDaroku19ppWWZ6z/Xlj3NcfmjHgAAAABJRU5ErkJggg=="
                                alt="high-volume--v1"
                                onClick={props.setMuted}
                            />
                        </>}
                        <div className="control-volume-slider">
                            <input type="range" value={props.volume} min={0} max={1} step={0.05} onChange={props.changeVolume} />
                        </div>
                    </button>
                    <button onClick={props.remove}>
                        <img className="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAA3klEQVR4nOWUMQrCMBSGQwepgx7JuvQWvYarQzu46aYnMJuzg4IX6WKPIdhPgk8aJSolkYr+8Ia8JP/XvsCv1M8IGAMa2HmWBhKX+Rk4BgBU4tVAhGo24gCTiMVL282DKV/zp36dA4AlkFvr3PRCAnKumkthA70BRsCMRgv1Qt8H4NMjAlZAYa2LoI/cVp0AtORQiKjoS1SsXWFXOcJrC6QOo1T23oedXEgM1XGhBE5AZp3NpFc6zhuPUZtfHgB7oAYmUrX0hh7TvIP05Mtu2oR4r0dIBEyloqDm6q91ASXNgzsUQZ4vAAAAAElFTkSuQmCC" alt="external-Remove-chat-tanah-basah-basic-outline-tanah-basah" />
                    </button>
                </div>
                <input type="range" value={props.currentTime||0} min={0} max={props.duration||1} step={0.01} className="control-playback-slider" onChange={props.updateTiming} />
                <div className="control-times">
                    <span className="control-currenttime">
                        {formatTime(props.currentTime||0)}
                    </span>
                    <span className="control-duration">
                        {formatTime(props.duration||1)}
                    </span>
                </div>
            </div>
        </div>
        <style>{`
            .icon {
                position: relative;
                width: 24px;
                height: 24px;
            }

            .small-icon {
                position: relative;
                width: 18px;
                height: 18px;
            }

            .control-modal {
                position: fixed;
                bottom: 9px;
                right: 18px;
                margin: 0.375em 0.75em;
                padding: 0.75em 1.5em;
                border-radius: 8px;
                /*background: linear-gradient(19deg, #000000f0, #1c1c1cd9, #353535cc, #000000f2);*/
                background: rgba(18,19,27,0.9);
                color: #dddddd;
                box-shadow: 0px 1px 1px rgba(0,0,0,0.09), 1px 2px 2px rgba(0,0,0,0.09), 2px 4px 4px rgba(0,0,0,0.09);
                text-shadow: 0px 1px 1px rgba(0,0,0,0.09), 1px 2px 2px rgba(0,0,0,0.09), 2px 4px 4px rgba(0,0,0,0.09);
                font-size: 15pt;
                font-weight: 1000;
                text-overflow: ellipsis;
            }

            .control-content,
            .control-video {
                display: flex;
                justify-content: center;
                align-items: flex-start;
                flex-direction: column;
                gap: 8px;
            }

            .video-select-btn {
                color: white;
                padding: 0 0.375em;
                font-size: 10pt;
                text-decoration: underline;
            }

            .media {
                position: relative;
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin: 0 0.375em;
            }

            .video-opt,
            .video-opt-active {
                display: flex;
                width: 100%;
                justify-content: space-between;
                align-items: flex-start;
                height: 46px;
                background: #00000063;
                border-radius: 4px;
                padding: 0.375em 0.75em;
                font-size: 12pt;
            }
            .video-opt-active {
                background: #ffffff15;
                margin-top: 18px;
            }

            .video-index {
                position: relative;
                flex: 0 0 36px;
                font-weight: 400;
            }

            .video-info {
                flex: 1 1 0px;
                text-align: start;
                display: flex;
                align-items: center;
                flex-direction: column;
                max-width: 216px
            }

                .video-title {
                    width: 100%;
                    overflow: hidden;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                }

                .video-subtitle {
                    width: 100%;
                    text-overflow: ellipsis;
                    overflow: hidden;
                    font-weight: 100;
                    font-size: 10pt;
                    white-space: nowrap;
                }

            .video-menu {
                flex: 0 0 32px;
                padding: 0 0.375em;
            }

            .control-load {
                background: #373737;
                font-size: 10pt;
                font-weight: 1000;
                width: 36px;
                height: 24px;
                display: flex;
                justify-content: center;
                align-items: center;
                border: 1px solid darkgrey;
                border-radius: 9px;
                outline: none;
                color: white;
                transition: .2s background;
            }

            .control-load:hover,
            .video-opt:hover {
                background: #1e1e1e7a;
                cursor: pointer;
            }

            .control-video {
                display: flex;
                justify-content: center;
                align-items: flex-start;
                flex-direction: column;
                gap: 8px;
                padding: 0.75em;
                background: #ffffff15;
                margin-top: 0.5em;
                border-radius: 2px;
            }

            .control-buttons {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 36px;
            }

            .control-buttons button {
                background: #2f2f2f;
                font-size: 10pt;
                font-weight: 1000;
                display: flex;
                justify-content: center;
                align-items: center;
                border: 1px solid darkgrey;
                border-radius: 9px;
                outline: none;
                color: white;
                transition: .2s background;
                padding: 0.375em;
            }

            .control-volume {
                position: relative;
                width: 36px;
            }

            .control-volume-slider {
                position: absolute;
                bottom: 100%;
                left: 0;
                width: 100%;
                height: 146px;
                visibility: collapse;
                border-radius: 9px;
                border: 1px solid grey;
                background: #2f2f2f;
            }

            .control-volume-slider input {
                transform: rotateZ(-90deg) translate(-50%, -304%);
            }

            .control-volume:hover > .control-volume-slider,
            .control-volume-slider:hover {
                visibility: visible;
            }

            .control-playback-slider {
                width: 100%;
                padding: 0.75em 0;
            }

            .control-times {
                position: relative;
                width: 100%;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 10pt;
                color: white;
            }

            .active {
                background: #ff0000 !important;
            }

            /* Styling the track (the background of the slider) */
            input[type="range"]::-webkit-slider-runnable-track {
                background: linear-gradient(0deg, transparent 4px, blue 4px, blue 12px, transparent 12px, transparent 16px);
                height: 16px;
            }

            /* Styling the thumb (the button of the slider) */
            input[type="range"]::-webkit-slider-thumb {
                width: 16px;
                height: 16px;
                background-color: blue !important;
                border-radius: 50%;
                cursor: pointer;
                border: 2px solid blue;
            }

            /* Firefox (Gecko) Styles */
            input[type="range"]::-moz-range-track {
                background: linear-gradient(0deg, transparent 4px, blue 4px, blue 12px, transparent 12px, transparent 16px);
            }

            input[type="range"]::-moz-range-thumb {
                background-color: blue !important;
                border-radius: 50%;
                cursor: pointer;
            }
        `}</style>
    </>)
}