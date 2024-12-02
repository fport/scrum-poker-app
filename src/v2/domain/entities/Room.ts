import { User } from './User';

export class Room {
  constructor(
    public readonly id: string,
    public readonly teamName: string,
    private users: User[] = [],
    private showVotes: boolean = false,
    private currentTask?: string,
    private lastActivity: Date = new Date()
  ) {}

  public addUser(user: User): void {
    if (this.users.find(u => u.id === user.id)) {
      throw new Error('User already exists in room');
    }
    this.users.push(user);
    this.updateActivity();
  }

  public removeUser(userId: string): void {
    this.users = this.users.filter(u => u.id !== userId);
    this.updateActivity();
  }

  public toggleVotes(userId: string): void {
    const user = this.users.find(u => u.id === userId);
    if (!user?.isScrumMaster) {
      throw new Error('Only Scrum Master can toggle votes');
    }
    this.showVotes = !this.showVotes;
    this.updateActivity();
  }

  public startNewTask(userId: string, taskName: string): void {
    const user = this.users.find(u => u.id === userId);
    if (!user?.isScrumMaster) {
      throw new Error('Only Scrum Master can start new task');
    }
    this.currentTask = taskName;
    this.showVotes = false;
    this.users.forEach(u => u.clearVote());
    this.updateActivity();
  }

  public getUsers(): User[] {
    return [...this.users];
  }

  public getUserCount(): number {
    return this.users.length;
  }

  public isActive(): boolean {
    const inactiveThreshold = 60 * 60 * 1000; // 1 hour
    return (
      this.users.length > 0 ||
      Date.now() - this.lastActivity.getTime() < inactiveThreshold
    );
  }

  private updateActivity(): void {
    this.lastActivity = new Date();
  }

  public toJSON() {
    return {
      id: this.id,
      teamName: this.teamName,
      users: this.users.map(u => u.toJSON()),
      showVotes: this.showVotes,
      currentTask: this.currentTask,
      lastActivity: this.lastActivity
    };
  }
} 