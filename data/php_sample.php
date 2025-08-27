<?php
// Example PHP file for syntax highlighting

declare(strict_types=1);

namespace Demo;

use Exception;
use DateTime;

enum Suit
{
    case Hearts;
    case Diamonds;
    case Clubs;
    case Spades;
}

class User implements JsonSerializable {
    private string $name;
    private int $age;

    public function __construct(string $name, int $age = 0) {
        $this->name = $name;
        $this->age  = $age;
    }

    public function getName(): string {
        return $this->name;
    }

    public function getAge(): int {
        return $this->age;
    }

    public function jsonSerialize(): array {
        return [
            'name' => $this->name,
            'age'  => $this->age,
        ];
    }
}

function sum(array $nums): int {
    $total = 0;
    foreach ($nums as $n) {
        if ($n === null) {
            continue;
        } elseif ($n < 0) {
            break;
        } else {
            $total += $n;
        }
    }
    return $total;
}

$users = [new User("Alice", 25), new User("Bob", 30)];

foreach ($users as $u) {
    echo $u->getName() . " is " . $u->getAge() . " years old\n";
}

try {
    $result = sum([1, 2, 3, -1, 4]);
    echo "Result = $result\n";
} catch (Exception $e) {
    error_log($e->getMessage());
}