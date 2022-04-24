export { EventEmitter, BroadcastChannelEventEmitter };

class EventEmitter {
    constructor() {

    }

    forTest = () => {
        return "Test!";
    }

    emit = () => {
        console.log("No Event Emitted");
    }
}

class BroadcastChannelEventEmitter {
    constructor(broadcastChannel) {
        this.bc = broadcastChannel;
    }

    emit = (eventName, item) => {
        this.bc.postMessage({
            eventName: eventName,
            item: item
          });
    }
}

// module.exports = { EventEmitter, BroadcastChannelEventEmitter };
