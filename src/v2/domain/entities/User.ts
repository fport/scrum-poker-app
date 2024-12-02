export class User {
  private vote?: string;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly isScrumMaster: boolean
  ) {}

  public submitVote(value: string): void {
    this.vote = value;
  }

  public clearVote(): void {
    this.vote = undefined;
  }

  public getVote(): string | undefined {
    return this.vote;
  }

  public toJSON() {
    return {
      id: this.id,
      name: this.name,
      isScrumMaster: this.isScrumMaster,
      vote: this.vote
    };
  }
} 