import { takeLatest } from "redux-saga/effects";

function* messagingConnectionFlow(): Generator {
  // Placeholder for messaging socket lifecycle.
}

export function* messagingSaga(): Generator {
  yield takeLatest("messaging/connectRequested", messagingConnectionFlow);
}
