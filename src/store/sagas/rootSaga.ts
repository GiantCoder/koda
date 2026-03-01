import { all } from "redux-saga/effects";
import { analysisSaga } from "./analysisSaga";
import { authSaga } from "./authSaga";
import { messagingSaga } from "./messagingSaga";
import { videoSaga } from "./videoSaga";

export function* rootSaga(): Generator {
  yield all([authSaga(), videoSaga(), analysisSaga(), messagingSaga()]);
}
