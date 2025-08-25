// Example TypeScript file for syntax highlighting

// Type alias and interface
type ID = number | string;

interface Person {
    id: ID;
    name: string;
    age?: number;
}

// Enum
enum Role {
    Admin,
    User,
    Guest
}

// Class with generics and inheritance
class User<T extends Person> {
    private role: Role;

    constructor(public data: T, role: Role = Role.User) {
        this.role = role;
    }

    get id(): ID {
        return this.data.id;
    }

    printInfo(): void {
        console.log(`${this.data.name} (${Role[this.role]})`);
    }
}

// Generic function
function identity<T>(value: T): T {
    return value;
}

// Arrow function and async/await
const fetchUser = async (id: ID): Promise<Person> => {
    return { id, name: "Alice", age: 25 };
};

// Union, intersection, type assertions
let input: string | number = "42";
let result = (input as string).toUpperCase();

// Arrays, tuples
let nums: number[] = [1, 2, 3];
let pair: [string, number] = ["age", 30];

// Map, Set (built-ins)
const map = new Map<string, number>();
map.set("one", 1);

const set = new Set<ID>([1, "two"]);

// Usage
(async () => {
    const person = await fetchUser(1);
    const user = new User(person, Role.Admin);
    user.printInfo();
    console.log(identity(nums));
})();