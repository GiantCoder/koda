import { takeLatest } from "redux-saga/effects";

function* uploadVideoFlow(): Generator {
  // Placeholder for tus upload orchestration.
}

export function* videoSaga(): Generator {
  yield takeLatest("video/uploadRequested", uploadVideoFlow);
}
