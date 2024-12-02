export enum RoomEventType {
  ROOM_CREATED = 'roomCreated',
  ROOM_UPDATED = 'roomUpdate',
  USER_JOINED = 'userJoined',
  USER_LEFT = 'userLeft',
  VOTE_SUBMITTED = 'voteSubmitted',
  VOTES_TOGGLED = 'votesToggled',
  NEW_TASK_STARTED = 'newTaskStarted',
  ERROR = 'error'
}

export interface RoomEvent {
  type: RoomEventType;
  payload: any;
}
