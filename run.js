import { BroadcastChannelEventEmitter } from "./EventEmitter.js";

const timeoutIdByTodoIdMap = new Map();

if (!window.indexedDB) {
  console.log("No IndexedDB");
  throw "No IndexedDB";
} else {
  console.log("IndexedDB Available");
}

let request = window.indexedDB.open("TodoDb", 2);
let db;

request.onerror = function (event) {
  console.log("Error opening DB", event);
};

/** @param {MyDbEvent} event */
request.onupgradeneeded = function (event) {
  console.log("Upgrading db");
  const db = event.target.result;
  db.createObjectStore("item", { keyPath: "id", autoIncrement: true });
};

/** @param {MyDbEvent} event */
request.onsuccess = function (event) {
  db = event.target.result;

  db.onerror = function (event) {
    alert("Database error: " + event.target.errorCode);
  };

  // GET ALL
  const readItems = db.transaction(["item"], "readonly").objectStore("item");
  /** @param {MyDbEvent} event */
  readItems.getAll().onsuccess = function (event) {
    event.target.result.forEach(function (item) {
      document.dispatchEvent(new CustomEvent("ItemAdded", {
        detail: {
          item: item
        }
      }));
    });
  };

  // Handling Syncing
  if (window.location.hash) {
    const syncList = JSON.parse(atob(window.location.hash.substr(1))).map(item => item.name);
    const proceedWithSync = confirm("Request to sync the following:\n\n"
      + syncList.map(item => "\t* " + item).join("\n")
      + "\n\nProceed?");

    if (proceedWithSync) {
      syncList.forEach(function (itemName) {
        addItem(itemName);
      });
    }

    window.location.hash = "";
  }
};

// ADD
document.getElementById("todo-form").addEventListener("submit", function (event) {
  event.preventDefault();
  addItem(document.getElementById("todo-name").value);
}, false);

// DELETE
document.getElementById("todo-list").addEventListener("click", function (event) {
  if (event.target.type === "checkbox") {
    if (event.target.checked) {
      emitEvent("ItemMarkedForRemoval", { id: event.target.parentElement.todoId });

      timeoutIdByTodoIdMap.set(
        event.target.parentElement.todoId,
        setTimeout(function (db, todoId) {
          db.transaction(["item"], "readwrite").objectStore("item").delete(todoId).onsuccess = function () {
            emitEvent("ItemRemoved", { id: todoId });
          };
        }, 10 * 1000, db, event.target.parentElement.todoId)
      );
    } else {
      emitEvent("ItemRemovalCancelled", { id: event.target.parentElement.todoId });

      if (timeoutIdByTodoIdMap.has(event.target.parentElement.todoId)) {
        clearTimeout(timeoutIdByTodoIdMap.get(event.target.parentElement.todoId));
      }
    }
  }
});

const receiveChannel = new BroadcastChannel('todo-broadcast');

const eventEmitter = new BroadcastChannelEventEmitter(new BroadcastChannel('todo-broadcast'));

// Delegate all broadcast channel events to dispatch events
receiveChannel.onmessage = function (event) {
  document.dispatchEvent(new CustomEvent(event.data.eventName, {
    detail: {
      item: {
        id: event.data.item.id,
        name: event.data.item.name
      }
    }
  }));
};

const emitEvent = (eventName, item) => {
  eventEmitter.emit(eventName, item);
};

/**
 * DB Event
 * @name MyDbEvent
 * @property {IDBRequest} target
 */

const addItem = function (itemName) {
  /** @param {MyDbEvent} event */
  db.transaction(["item"], "readwrite").objectStore("item").add({ name: itemName }).onsuccess = function (event) {
    /** @param {MyDbEvent} event */
    event.target.transaction.objectStore("item").get(event.target.result).onsuccess = function (event) {
      emitEvent("ItemAdded", { id: event.target.result.id, name: event.target.result.name });
    };
  };
};

document.addEventListener("ItemAdded", function (event) {
  const li = document.createElement("li");

  const checkBox = document.createElement("input");
  checkBox.setAttribute("type", "checkbox")
  li.appendChild(checkBox);

  if (event.detail.item.name) {
    li.appendChild(document.createTextNode(`${event.detail.item.name} `));
    const span = document.createElement("span");
    span.appendChild(document.createTextNode(`[${event.detail.item.id}]`));
    span.classList.add("internal-identifier");
    li.appendChild(span);
  } else {
    li.classList.add("divider");
    li.appendChild(document.createElement("hr"));
  }
  li.todoId = event.detail.item.id;
  li.id = "item-" + event.detail.item.id;

  document.getElementById("todo-list").insertBefore(li, document.getElementById("todo-list").firstChild);
  document.getElementById("todo-name").value = "";

  emitEvent("TodoListModified", event.detail.item);
});

document.addEventListener("ItemMarkedForRemoval", function (event) {
  const el = document.getElementById("item-" + event.detail.item.id);
  el.classList.add("deleteCandidate");
  el.querySelector("input[type=checkbox]").checked = true;
});
document.addEventListener("ItemRemovalCancelled", function (event) {
  const el = document.getElementById("item-" + event.detail.item.id);
  el.classList.remove("deleteCandidate");
  el.querySelector("input[type=checkbox]").checked = false;
});
document.addEventListener("ItemRemoved", function (event) {
  const el = document.getElementById("item-" + event.detail.item.id);
  el.remove();
  emitEvent("TodoListModified", event.detail.item);
});

document.addEventListener("TodoListModified", function () {
  /** @param {MyDbEvent} event */
  db.transaction(["item"], "readonly").objectStore("item").getAll().onsuccess = function (event) {
    const encodedSyncString = btoa(JSON.stringify(event.target.result.map(item => { return { name: item.name } })));
    const encodedSyncStringSize = (new TextEncoder().encode(encodedSyncString)).length;
    const a = document.getElementById("sync-link-container");
    a.innerText = `Sync to device (${encodedSyncStringSize}b) \u29C9`;
    a.href = "#" + encodedSyncString;
  };
});