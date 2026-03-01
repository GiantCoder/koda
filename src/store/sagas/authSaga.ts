import { takeLatest } from "redux-saga/effects";

function* loginFlow(): Generator {
  // Placeholder for auth workflow (login/logout/refresh).
}

export function* authSaga(): Generator {
  yield takeLatest("auth/loginRequested", loginFlow);
}
