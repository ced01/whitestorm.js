WHS.World = class extends WHS.Object {
    constructor( params = {} ) {

        'use strict';

        if (!THREE)
            console.warn('WhitestormJS requires Three.js. {Object} THREE is undefined.');
        if (!Physijs)
            console.warn('WhitestormJS requires Physi.js. {Object} Physijs is undefined.');

        super({

            stats: false,
            autoresize: false,

            shadowmap: {
                enabled: true,
                type: THREE.PCFSoftShadowMap
            },

            helpers: {
                grid: false,
                axis: false
            },

            gravity: {
                x: 0,
                y: 0,
                z: 0
            },

            camera: {
                aspect: 75,
                near: 1,
                far: 1000,

                x: 0,
                y: 0,
                z: 0
            },

            rWidth: 1,
            rHeight: 1,

            width: window.innerWidth,
            height: window.innerHeight,

            physics: {

                quatNormalizeSkip: 0,
                quatNormalizeFast: false,

                solver: {
                    iterations: 20,
                    tolerance: 0,
                },

                defMaterial: {
                    contactEquationStiffness: 1e8,
                    contactEquationRegularizationTime: 3
                }

            },

            background: 0x000000,
            assets: "./assets",
            container: document.body,

            path_worker: '../libs/physijs_worker.js',
            path_ammo: '../libs/ammo.js'

        });

        super.setParams( params );

        native.set( this, {} );

        this._initScene();
        this._initDOM();
        this._initStats();
        this._initCamera();
        this._initRenderer();
        this._initHelpers();

        var scope = this;

        if ( this.getParams().autoresize )
            window.addEventListener('resize', () => {
                scope.setSize(
                    window.innerWidth,
                    window.innerHeight
                );
            });

        return scope;

    }

    _initScene() {

        this._initPhysiJS();

        let scene = new Physijs.Scene;

        scene.setGravity(
            new THREE.Vector3(
                this.getParams().gravity.x,
                this.getParams().gravity.y,
                this.getParams().gravity.z
            )
        );

        this.setScene( scene );

        this.children = [];

    }

    _initPhysiJS() {

        this.simulate = true;

        Physijs.scripts.worker = this.getParams().path_worker;
        Physijs.scripts.ammo = this.getParams().path_ammo;

    }

    _initDOM() {

        this.getParams().container.style.margin = 0;
        this.getParams().container.style.padding = 0;
        this.getParams().container.style.position = 'relative';
        this.getParams().container.style.overflow = 'hidden';

        this._dom = document.createElement('div');
        this._dom.className = "whs";

        this.getParams().container.appendChild(this._dom);

        return this._dom;

    }

    _initStats() {
        if (this.getParams().stats) {

            this._stats = new Stats();

            if (this.getParams().stats == "fps")
                this._stats.setMode(0);

            else if (this.getParams().stats == "ms")
                this._stats.setMode(1);

            else if (this.getParams().stats == "mb")
                this._stats.setMode(1);

            else {
                this._stats.setMode(0);

                console.warn([this._stats], "Please, apply stats mode [fps, ms, mb] .");
            }

            this._stats.domElement.style.position = 'absolute';
            this._stats.domElement.style.left = '0px';
            this._stats.domElement.style.bottom = '0px';

            this._dom.appendChild(this._stats.domElement);

        }

    }

    _initCamera() {

        this.setCamera( new WHS.PerspectiveCamera({
            camera: {
                fov: this.getParams().camera.aspect,
                aspect: this.getParams().width / this.getParams().height,
                near: this.getParams().camera.near,
                far: this.getParams().camera.far
            },

            pos: {
                x: this.getParams().camera.x,
                y: this.getParams().camera.y,
                z: this.getParams().camera.z
            }
        }) );

        this.getCamera().addTo( this );

    }

    _initRenderer() {

        this.render = true;

        this.setRenderer( new THREE.WebGLRenderer() );
        this.getRenderer().setClearColor( this.getParams().background );

        this.getRenderer().shadowMap.enabled = this.getParams().shadowmap.enabled;
        this.getRenderer().shadowMap.type = this.getParams().shadowmap.type;
        this.getRenderer().shadowMap.cascade = true;

        this.getRenderer().setSize(
            +( this.getParams().width * this.getParams().rWidth ).toFixed(),
            +( this.getParams().height * this.getParams().rHeight ).toFixed()
        );

        this.getRenderer().render( this.getScene(), this.getCamera().getNative() );

        this._dom.appendChild( this.getRenderer().domElement );

        this.getRenderer().domElement.style.width = '100%';
        this.getRenderer().domElement.style.height = '100%';

    }

    _initHelpers() {

        if ( this.getParams().helpers.axis )
            this.getScene().add(
                new THREE.AxisHelper(
                    this.getParams().helpers.axis.size
                    ? this.getParams().helpers.axis.size
                    : 5
                )
            );

        if ( this.getParams().helpers.grid )
            this.getScene().add(
                new THREE.GridHelper(
                    this.getParams().helpers.grid.size
                    ? this.getParams().helpers.grid.size
                    : 10,
                    this.getParams().helpers.grid.step
                    ? this.getParams().helpers.grid.step
                    : 1
                )
            );

    }

    start() {

        'use strict';

        var clock = new THREE.Clock();
        var scope = this;

        window.requestAnimFrame = (function(){
            return  window.requestAnimationFrame       ||
                    window.webkitRequestAnimationFrame ||
                    window.mozRequestAnimationFrame    ||
                    function( callback ){
                        window.setTimeout(callback, 1000 / 60);
                    };
        })();


        let scene = scope.getScene(),
            camera_native = scope.getCamera().getNative(),
            renderer = scope.getRenderer();

        function reDraw(time) {

            window.requestAnimFrame( reDraw );

            // Init stats.
            if (scope._stats) scope._stats.begin();

            scope._process( clock );

            if ( scope.simulate ) scene.simulate();
            if ( scope.controls ) scope._updateControls();

            // Effects rendering.
            if ( scope._composer ) {

                scope._composer.reset();

                if ( scope.render ) scope._composer.render(
                    scene,
                    camera_native
                );

                scope._composer.pass( scope._composer.stack );

                scope._composer.toScreen();

            } else {

                if ( scope.render ) renderer.render(
                    scene,
                    camera_native
                );

            }

            scope._execLoops( time );

            // End helper.
            if (scope._stats) scope._stats.end();
        }

        this._update = reDraw;

        scope._update();
    }

    _execLoops( time ) {

        for(let i = 0; i < WHS.loops.length; i++) {
            let l = WHS.loops[i];
            if ( l.enabled ) l.func( l.clock, time );
        }

    }

    _updateControls() {

        this.controls.update(Date.now() - this.time);
        this.time = Date.now();

    }

    _process( clock ) {

            let delta = clock.getDelta();

            for ( let i = 0; i < this.children.length; i++ ) {

                if ( this.children[i]._type == "morph" )
                    this.children[i].getNative().mixer.update( delta );

            }

    }

    setSize( width = 1, height = 1) {

        this.getCamera().getNative().aspect = width / height;
        this.getCamera().getNative().updateProjectionMatrix();

        this.getRenderer().setSize(
            +(width * this.getParams().rWidth).toFixed(),
            +(height * this.getParams().rHeight).toFixed()
        );

    }

    setScene( scene ) {
        return native.get( this ).scene = scene;
    }

    getScene() {
        return native.get( this ).scene;
    }

    setRenderer( renderer ) {
        return native.get( this ).renderer = renderer;
    }

    getRenderer() {
        return native.get( this ).renderer;
    }

    setCamera( camera ) {

        if ( camera instanceof WHS.Camera )
            native.get( this ).camera = camera;
        else
            console.error("@WHS.World: camera in not an instance of WHS.Camera.");

        return this;

    }

    getCamera() {
        return native.get( this ).camera;
    }

}