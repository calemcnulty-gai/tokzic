export type RootStackParamList = {
  MainStack: undefined;
  AuthStack: undefined;
};

export type AuthStackParamList = {
  Auth: undefined;
};

export type MainStackParamList = {
  Feed: undefined;
  VideoDetail: { videoId: string };
  Settings: undefined;
}; 