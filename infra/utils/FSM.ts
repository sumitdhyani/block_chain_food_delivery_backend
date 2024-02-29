export class AFSMError extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
    }
}

export class FinalityReachedException extends AFSMError {
    constructor() {
        super("State machine has reached final state and can't process any new events");
    }
}

export class SMInactiveException extends AFSMError {
    constructor() {
        super("State machine needs to be started by calling the start() method");
        this.name = "SMInactiveException";
    }
}

export class UnhandledEvtException extends AFSMError {
    constructor(stateName: string, evtName: string) {
        super(`Event: ${evtName} is unhandled in state: ${stateName}`);
    }
}

export class ImproperReactionException extends AFSMError {
    constructor(stateName: string, evtName: string) {
        super(`Improper reaction from state: ${stateName}, while handling event: ${evtName}, the reaction should be either a new State or a member of enum SpecialTransition`);
    }
}

export class RecursiveEventException extends AFSMError {
    constructor() {
        super(`Raising an event on FSM while it is already processing an event`);
    }
}

enum SpecialTransition {
    NullTransition,
    DeferralTransition
};

type Transition = State | SpecialTransition;

export class State {
    isFinal: boolean;
    name: string;

    constructor(isFinal = false) {
        this.isFinal = isFinal;
        this.name = this.constructor.name;
    }

    on_launch(): Transition {
        return SpecialTransition.NullTransition;
    }

    onEntry(): void {}

    beforeExit(): void {}

    final(): boolean {
        return this.isFinal;
    }

    react(evtName: string, evtData: any): Transition {
        let expectedEvtHandlerMethodName = "on_" + evtName;
        if ((typeof (this as any)[expectedEvtHandlerMethodName]).localeCompare("function")) {
            throw new UnhandledEvtException(this.name, evtName);
        }
        
        let transition: any = null !== evtData?
                                (this as any)[expectedEvtHandlerMethodName](evtData) : 
                                (this as any)[expectedEvtHandlerMethodName]();
        if (transition as Transition !== undefined) {
            return transition as Transition;
        } else {
            throw new ImproperReactionException(this.name, evtName);
        }
    }

    private isTransitionObject(arg: any) : boolean {
        return arg instanceof State || Object.values(SpecialTransition).includes(arg);
    }
}

export class FSM {
    currState: State;
    logger: any;
    started: boolean;
    smBusy: boolean;
    deferralQueue: [string, any][];

    constructor(startStateFetcher: () => State, logger: any) {
        this.currState = startStateFetcher();
        this.logger = logger;
        this.started = false;
        this.smBusy = false; // FSM is busy processing an event
        this.deferralQueue = [];
    }

    checkIfFSMReadyToHandleEvt(): void {
        if (!this.started) {
            throw new SMInactiveException();
        } else if (this.currState.final()) {
            throw new FinalityReachedException();
        } else if (this.smBusy) {
            throw new RecursiveEventException();
        }
    }

    handleEvent(evtName: string, evtData: any = null): void {
        this.checkIfFSMReadyToHandleEvt();
        this.processSingleEvent(evtName, evtData);
    }

    processSingleEvent(evtName: string, evtData: any): void {
        this.smBusy = true;
        let transition: Transition | null = null;
        try {
            transition = this.currState.react(evtName, evtData);
        } finally {
            this.smBusy = false;
        }
        this.smBusy = false;
        if (transition instanceof State) {
            this.currState.beforeExit();
            this.currState = transition;
            this.handleStateEntry(this.currState);
        } else if (SpecialTransition.DeferralTransition == transition) {
            this.deferralQueue.push([evtName, evtData]);
        }
    }

    start(): void {
        this.started = true;
        if (this.currState.final()) {
            throw new FinalityReachedException();
        }
        this.handleStateEntry(this.currState);
    }

    processDeferralQueue(): void {
        if (0 == this.deferralQueue.length) {
            return;
        }
        let local = this.deferralQueue;
        this.deferralQueue = [];
        for (let i = 0; i < local.length; i++) {
            try {
                this.checkIfFSMReadyToHandleEvt();
                let [evtName, evtData] = local[i];
                this.processSingleEvent(evtName, evtData);
            } catch (err) {
                this.logger.warn(`Error while processing deferral queue: ${err}`);
            }
        }
    }

    handleStateEntry(state: State): void {
        this.logger.info(`Entered "${state.constructor.name}" state`);
        state.onEntry();
        this.handleEvent("launch");
        this.processDeferralQueue();
    }
}

export class CompositeState extends State {
    fsm: FSM;

    constructor(startStateFetcher: () => State, logger: any, isFinal = false) {
        super(isFinal);
        this.fsm = new FSM(startStateFetcher, logger);
    }

    initiateExit(): void {
        if (this.fsm.currState instanceof CompositeState) {
            this.fsm.currState.initiateExit();
        }
        this.fsm.currState.beforeExit();
    }

    react(name: string, evtData: any): Transition {
        let transition: Transition = SpecialTransition.NullTransition;
        try {
            transition = super.react(name, evtData);
        } catch (err) {
            if (!(err instanceof UnhandledEvtException)) {
                throw err;
            }
        } finally {
            if (0 == name.localeCompare('launch')) {
                this.fsm.start();
                if (transition instanceof State) {
                    this.initiateExit();
                    return transition;
                }
            } else if (transition instanceof State) {
                this.initiateExit();
                return transition;
            }
        }
        try {
            this.fsm.handleEvent(name, evtData);
        } catch (err) {
            if (!(err instanceof FinalityReachedException)) {
                throw err;
            }
        }
        return SpecialTransition.NullTransition;
    }
}


////// Code to test the FSM /////////////////////////////////////////////////////////
const logger = {debug : (str: string) => console.log(str),
    info : (str: string) => console.log(str),
    warn : (str: string) => console.log(str)}

class Camera extends FSM{
    constructor(){
    super(()=>{ return new Idle()}, logger)
    }
}

class Idle extends State{
    on_focus(){
        logger.info(`Received "focus" event`)
        return new Focusing()
    }

    on_shoot(){
        logger.info(`Received "shoot" event`)
        return new Shooting()
    }

    on_browse(){
        logger.info(`Received "browse" event`)
        return new Browsing()
    }
}

class Shooting extends State{
    on_browse(){
        logger.info(`Received "browse" event`)
        return new Browsing()
    }

    on_focus(){
        logger.info(`Received "focus" event`)
        return new Focusing()
    }
}

class Browsing extends State{
    on_displayImage(imageName: string) {
        logger.info(`Display image, image name: ${imageName}`)
        return SpecialTransition.NullTransition
    }

    on_shoot(){
        logger.info(`Received "shoot" event`)
        return new Shooting()
    }
}

class Focusing extends State{
    on_focused(){
        logger.info(`Received "focused" event`)
        return new Focused()
    }

    on_click(){
        logger.info(`Received "click" deferring it for the time when focus will be completed`)
        return SpecialTransition.DeferralTransition
    }
}

class Focused extends State{
    on_click(){
        logger.info(`Received "click" event, image clicked!`)
        return SpecialTransition.NullTransition
    }

    on_buttonReleased(){
        logger.info(`Received "buttonReleased" event`)
        return new Idle()
    }
}

// Creating FSM and passing events

const fsm = new Camera()

try{
    fsm.start()
    fsm.handleEvent("browse")
    fsm.handleEvent("displayImage", "sample.png")
    fsm.handleEvent("shoot")
    fsm.handleEvent("focus")
    fsm.handleEvent("click")
    fsm.handleEvent("click")
    fsm.handleEvent("focused")
}
catch(err){
    logger.info(`Exception while placing events, details: ${err}`)
}

