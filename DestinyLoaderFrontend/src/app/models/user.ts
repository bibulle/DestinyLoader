export class User {

  id: string;
  profilePicturePath: string;

  constructor(options) {

    if (options) {
      this.id = options.id;
    }

  }

}

