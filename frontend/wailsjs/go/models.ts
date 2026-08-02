export namespace model {
	
	export class Adjective {
	    id: number;
	    root: string;
	    adjective: string;
	    derivedAdverb: string;
	    translationLiteral: string;
	    translationFigurative: string;
	    exampleLiteral: string;
	    exampleFigurative: string;
	
	    static createFrom(source: any = {}) {
	        return new Adjective(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.root = source["root"];
	        this.adjective = source["adjective"];
	        this.derivedAdverb = source["derivedAdverb"];
	        this.translationLiteral = source["translationLiteral"];
	        this.translationFigurative = source["translationFigurative"];
	        this.exampleLiteral = source["exampleLiteral"];
	        this.exampleFigurative = source["exampleFigurative"];
	    }
	}

}

