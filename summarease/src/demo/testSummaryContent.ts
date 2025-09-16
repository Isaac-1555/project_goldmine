/**
 * Demo content for testing the enhanced summary generation
 * This file contains sample educational content with code and mathematical concepts
 */

export const testContent = {
  programming: `
# Introduction to Algorithms and Data Structures

Today we'll explore fundamental concepts in computer science, focusing on sorting algorithms and their time complexities.

## Bubble Sort Algorithm

Bubble sort is a simple sorting algorithm that repeatedly steps through the list, compares adjacent elements and swaps them if they're in the wrong order. Here's the implementation:

def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n-i-1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
    return arr

The time complexity of bubble sort is O(n²) in the worst case, where n is the number of elements.

## Quick Sort Algorithm

Quick sort is more efficient, using a divide-and-conquer approach:

def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quick_sort(left) + middle + quick_sort(right)

Quick sort has an average time complexity of O(n log n), making it much faster for large datasets.

## Binary Search

Binary search is an efficient algorithm for finding an item in a sorted list:

def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

Binary search has a time complexity of O(log n), which is very efficient for large sorted arrays.
`,

  mathematics: `
# Calculus: Derivatives and Integrals

## Introduction to Derivatives

The derivative represents the rate of change of a function. The basic definition is:

f'(x) = lim(h→0) [f(x+h) - f(x)] / h

## Common Derivative Rules

1. Power Rule: If f(x) = x^n, then f'(x) = nx^(n-1)
2. Product Rule: (fg)' = f'g + fg'
3. Chain Rule: If y = f(g(x)), then dy/dx = f'(g(x)) · g'(x)

## Examples of Derivatives

For f(x) = x^3 + 2x^2 - 5x + 3:
f'(x) = 3x^2 + 4x - 5

For g(x) = sin(x^2):
g'(x) = 2x · cos(x^2)

## Introduction to Integrals

The integral is the reverse operation of differentiation. The fundamental theorem of calculus states:

∫[a to b] f(x)dx = F(b) - F(a), where F'(x) = f(x)

## Common Integral Forms

1. ∫x^n dx = x^(n+1)/(n+1) + C, n ≠ -1
2. ∫1/x dx = ln|x| + C
3. ∫e^x dx = e^x + C
4. ∫sin(x) dx = -cos(x) + C
5. ∫cos(x) dx = sin(x) + C

## Integration by Parts

The formula for integration by parts is:
∫u dv = uv - ∫v du

This is particularly useful for products of functions like ∫x·e^x dx.
`,

  mixed: `
# Machine Learning: Linear Regression

## Understanding Linear Regression

Linear regression is a fundamental machine learning algorithm used for predicting continuous values. The model assumes a linear relationship between input features and the target variable.

## Mathematical Foundation

The linear regression model can be expressed as:
y = β₀ + β₁x₁ + β₂x₂ + ... + βₙxₙ + ε

Where:
- y is the target variable
- x₁, x₂, ..., xₙ are the features
- β₀ is the intercept
- β₁, β₂, ..., βₙ are the coefficients
- ε is the error term

## Cost Function

We use Mean Squared Error (MSE) as our cost function:
J(θ) = (1/2m) Σ(h(x⁽ⁱ⁾) - y⁽ⁱ⁾)²

## Implementation in Python

Here's a simple implementation of linear regression using gradient descent:

import numpy as np

class LinearRegression:
    def __init__(self, learning_rate=0.01, n_iterations=1000):
        self.learning_rate = learning_rate
        self.n_iterations = n_iterations
        self.weights = None
        self.bias = None
    
    def fit(self, X, y):
        n_samples, n_features = X.shape
        self.weights = np.zeros(n_features)
        self.bias = 0
        
        for _ in range(self.n_iterations):
            # Forward pass
            y_predicted = np.dot(X, self.weights) + self.bias
            
            # Calculate gradients
            dw = (1/n_samples) * np.dot(X.T, (y_predicted - y))
            db = (1/n_samples) * np.sum(y_predicted - y)
            
            # Update parameters
            self.weights -= self.learning_rate * dw
            self.bias -= self.learning_rate * db
    
    def predict(self, X):
        return np.dot(X, self.weights) + self.bias

## Gradient Descent Algorithm

The gradient descent update rules are:
θⱼ := θⱼ - α · ∂J(θ)/∂θⱼ

Where α is the learning rate and ∂J(θ)/∂θⱼ is the partial derivative of the cost function.

## Model Evaluation

Common metrics for evaluating linear regression models:
1. R² Score: Measures the proportion of variance explained
2. Mean Absolute Error (MAE): Average absolute difference between predictions and actual values
3. Root Mean Square Error (RMSE): Square root of the average squared differences

## Terminal Commands for Data Processing

To prepare your data for machine learning, you might use these commands:

$ pip install pandas numpy scikit-learn
$ python preprocess_data.py --input data.csv --output processed_data.csv
$ python train_model.py --data processed_data.csv --model linear_regression
`
};

// Function to get a sample content for testing
export function getTestContent(type: 'programming' | 'mathematics' | 'mixed' = 'mixed'): string {
  return testContent[type];
}