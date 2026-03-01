import { configureStore } from "@reduxjs/toolkit";
import createSagaMiddleware from "redux-saga";
import analysisReducer from "./slices/analysisSlice";
import authReducer from "./slices/authSlice";
import messagingReducer from "./slices/messagingSlice";
import uiReducer from "./slices/uiSlice";
import videoReducer from "./slices/videoSlice";
import { rootSaga } from "./sagas/rootSaga";

const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: {
    auth: authReducer,
    video: videoReducer,
    analysis: analysisReducer,
    messaging: messagingReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(sagaMiddleware),
});

sagaMiddleware.run(rootSaga);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
