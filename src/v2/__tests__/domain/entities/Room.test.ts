process.env.TEST_SUITE = 'domain';

import { Room } from '../../../domain/entities/Room';
import { User } from '../../../domain/entities/User';

describe('Room Entity', () => {
  let room: Room;
  let scrumMaster: User;
  let regularUser: User;

  beforeEach(() => {
    room = new Room('test-room', 'Test Team');
    scrumMaster = new User('user1', 'Scrum Master', true);
    regularUser = new User('user2', 'Regular User', false);
  });

  describe('addUser', () => {
    it('should add a user to the room', () => {
      room.addUser(scrumMaster);
      expect(room.getUserCount()).toBe(1);
      expect(room.getUsers()).toContainEqual(scrumMaster);
    });

    it('should throw error when adding duplicate user', () => {
      room.addUser(scrumMaster);
      expect(() => room.addUser(scrumMaster)).toThrow('User already exists in room');
    });
  });

  describe('removeUser', () => {
    it('should remove a user from the room', () => {
      room.addUser(scrumMaster);
      room.removeUser(scrumMaster.id);
      expect(room.getUserCount()).toBe(0);
    });
  });

  describe('toggleVotes', () => {
    it('should allow scrum master to toggle votes', () => {
      room.addUser(scrumMaster);
      room.toggleVotes(scrumMaster.id);
      expect(room.toJSON().showVotes).toBe(true);
    });

    it('should not allow regular user to toggle votes', () => {
      room.addUser(regularUser);
      expect(() => room.toggleVotes(regularUser.id)).toThrow('Only Scrum Master can toggle votes');
    });
  });

  describe('startNewTask', () => {
    it('should allow scrum master to start new task', () => {
      room.addUser(scrumMaster);
      room.startNewTask(scrumMaster.id, 'New Task');
      expect(room.toJSON().currentTask).toBe('New Task');
    });

    it('should clear all votes when starting new task', () => {
      room.addUser(scrumMaster);
      room.addUser(regularUser);
      regularUser.submitVote('5');
      room.startNewTask(scrumMaster.id, 'New Task');
      expect(regularUser.getVote()).toBeUndefined();
    });
  });
}); 