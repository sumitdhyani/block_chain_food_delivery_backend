class FinalityReachedException extends Error {
    constructor() {
        super("State machine has reached final state and can't process any new events");
    }
}

class NullStateException extends Error {
    constructor() {
        super("State can't be a nullptr return SpecialTransitions.NullTransition in case there is no state transition");
    }
}

class SMInactiveException extends Error {
    constructor() {
        super("State machine needs to be started by calling the start() method");
    }
}

enum SpecialTransition {
    NullTransition,
    DeferralTransition,
}

interface State {
    onEntry(): void;
    beforeExit(): void;
    isFinal(): boolean;
}

type Transition = State | SpecialTransition;

interface IEventProcessor<EvtType> {
    process(arg: EvtType): Transition;
}

class FSM {
    private currentState: State;
    private started: boolean;
    private unconsumedEventHandler: (desc: string) => void;
    private deferralQueue: Array<() => void> = [];

    constructor(fn: () => State, unconsumedEventHandler: (desc: string) => void) {
        this.currentState = fn();
        this.unconsumedEventHandler = unconsumedEventHandler;
        this.started = false;
    }

    handleEvent<EvtType>(evt: EvtType): void {
        this.onEvent(evt);
    }

    start(): void {
        this.started = true;
        if (this.currentState && this.currentState.isFinal()) {
            throw new FinalityReachedException();
        } else if (this.currentState) {
            this.handleStateEntry(this.currentState);
        }
    }

    protected onEvent<EvtType>(evt: EvtType): SpecialTransition {
        if (!this.started) {
            throw new SMInactiveException();
        } else if (this.currentState && this.currentState.isFinal()) {
            throw new FinalityReachedException();
        }

        try {
            const evtProcessor = this.currentState as IEventProcessor<EvtType>;
            const transition = evtProcessor.process(evt);

            if (transition instanceof State) {
                this.handleStateExit(this.currentState);
                this.currentState = transition;
                this.handleStateEntry(this.currentState);
            } else if (transition === SpecialTransition.DeferralTransition) {
                this.deferralQueue.push(() => this.handleEvent(evt));
            }
            return SpecialTransition.NullTransition;
        } catch (error) { //cast failed, so event not handled by curent state
        } 

        try
		{
			let childStateMachine = this.currentState as FSM;
			return childStateMachine.onEvent(evt);
		} catch (error) {
            if (!(error instanceof FinalityReachedException)) {
			    this.onUnconsumedEvent(evt);
            }
		} finally {
            return SpecialTransition.NullTransition;
        }

    }

    private processDeferralQueue(): void {
        while (this.deferralQueue.length > 0) {
            const deferredEvent = this.deferralQueue.shift();
            if (deferredEvent) {
                deferredEvent();
            }
        }
    }

    private handleStateEntry(state: State): void {
        state.onEntry();
        if (state instanceof FSM) {
            state.start();
        }
        this.processDeferralQueue();
    }

    private handleStateExit(state: State): void {
        if (state instanceof FSM) {
            this.handleStateExit(state.currentState);
        }
        state.beforeExit();
    }

    private onUnconsumedEvent<EvtType>(evt: EvtType): void {
        this.unconsumedEventHandler("Event description");
    }
}

abstract class CompositeState extends FSM implements State {
    onEntry: ()=> void;
    beforeExit: ()=> void;
    isFinal: ()=> boolean;

    constructor(fn: () => State, unconsumedEventHandler: (desc: string) => void, onEntry : ()=> void, beforeExit : ()=> void, isFinal: ()=> void) {
        super(fn, unconsumedEventHandler)
        this.onEntry = onEntry;
        this.beforeExit = beforeExit;
        this
    }   
}

class StateBase implements State{
    private final : boolean;
    constructor(final : boolean) {
      this.final = final
    }
  
    onEntry(): void {}
    beforeExit(): void {}
    isFinal() : boolean {return this.final}
  }