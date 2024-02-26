type DataCallback<Data extends any[]> = (...data: Data) => void;

export class PubSubDataRouter<Key, SubscriberId, Data extends any[]> {
  private routingTable: Map<Key, Map<SubscriberId, DataCallback<Data>>>;
  private regIdToKeys: Map<SubscriberId, Set<Key>>;

  constructor() {
    this.routingTable = new Map();
    this.regIdToKeys = new Map();
  }

  produce(key: Key, ...data: Data): boolean {
    let retVal = false;
    const subscribers = this.routingTable.get(key);
    if (subscribers) {
      retVal = true;
      subscribers.forEach(callback => {
        callback(...data);
      });
    }
    return retVal;
  }

  consume(key: Key, subscriberId: SubscriberId, callback: DataCallback<Data>): boolean {
    let retVal = true;
    let subscribers = this.routingTable.get(key);
    if (subscribers) {
      if (!subscribers.has(subscriberId)) {
        subscribers.set(subscriberId, callback);
        this.addToRegIdToKeys(subscriberId, key);
      } else {
        retVal = false;
      }
    } else {
      this.routingTable.set(key, new Map([[subscriberId, callback]]));
      this.addToRegIdToKeys(subscriberId, key);
    }
    return retVal;
  }

  unregister(key: Key, subscriberId: SubscriberId): boolean {
    return this.removeFromRoutingTable(key, subscriberId) &&
           this.removeFromRegIdStore(key, subscriberId);
  }

  unregisterAll(subscriberId: SubscriberId): boolean {
    const keys = this.regIdToKeys.get(subscriberId);
    if (keys) {
      keys.forEach(key => {
        this.removeFromRoutingTable(key, subscriberId);
      });
      this.regIdToKeys.delete(subscriberId);
      return true;
    } else {
      return false;
    }
  }

  private addToRegIdToKeys(subscriberId: SubscriberId, key: Key) {
    let keys = this.regIdToKeys.get(subscriberId);
    if (!keys) {
      keys = new Set();
      this.regIdToKeys.set(subscriberId, keys);
    }
    keys.add(key);
  }

  private removeFromRoutingTable(key: Key, subscriberId: SubscriberId): boolean {
    const subscribers = this.routingTable.get(key);
    if (subscribers && subscribers.has(subscriberId)) {
      subscribers.delete(subscriberId);
      if (subscribers.size === 0) {
        this.routingTable.delete(key);
      }
      return true;
    }
    return false;
  }

  private removeFromRegIdStore(key: Key, subscriberId: SubscriberId): boolean {
    const keys = this.regIdToKeys.get(subscriberId);
    if (!keys || !keys.delete(key)) {
      return false;
    }
    if (keys.size === 0) {
      this.regIdToKeys.delete(subscriberId);
    }
    return true;
  }
}


