export class Tag {
  static readonly list: Tag[] = [];

  static readonly STRIKE = new Tag('crucible', 'pvp', 'svgIcon');
  static readonly VANGUARD = new Tag('vanguard', '/assets/images/vanguard.png');
  static readonly GAMBIT = new Tag('gambit', '/assets/images/gambit.png');
  static readonly DESTINATION = new Tag('destination', '/assets/images/milestone.png');
  static readonly RAID = new Tag('raid', '/assets/images/raid.png');

  private constructor(public readonly name: string, public readonly icon: string, public readonly iconType = 'img') {
    Tag.list.push(this);
  }

}
