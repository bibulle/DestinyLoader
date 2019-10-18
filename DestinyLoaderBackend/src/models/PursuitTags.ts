export class PursuitTags {

    _id: string;

    key: string;
    tags: string[];

    /**
     * Constructor
     * @param option (the future object content)
     */
    constructor(key, tags = []) {


        this.key = key;
        this.tags = tags;
    }

}

