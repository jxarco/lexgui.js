#include <stdio.h>

// Typedef for a structure
typedef struct {
    int number;
    int square;
} Data;

// Function to calculate factorial
int factorial(int n) {
    int result = 1;
    for (int i = 1; i <= n; i++) {
        result *= i;
    }
    return result;
}

int main() {
    int num;
    printf("Enter a number: ");
    scanf("%d", &num);
    
    /* Conditional statement */
    if (num < 0) {
        printf("Factorial is not defined for negative numbers.\n");
    } else {
        // Structure usage
        Data data;
        data.number = num;
        data.square = num * num;

        printf("Factorial of %d is %d\n", num, factorial(num));
        printf("Square of %d is %d\n", data.number, data.square);
    }
    
    return 0;
}
