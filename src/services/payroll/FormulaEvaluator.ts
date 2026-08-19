/**
 * Formula Evaluator - Safe mathematical and logical expression evaluator
 * Strictly protects against arbitrary code execution (NO eval / Function constructor with unvetted scope)
 */

export interface FormulaEvaluationContext {
  variables: Record<string, number | boolean | string>;
  parameters: Record<string, any>;
}

export class FormulaEvaluator {
  private static allowedMathFunctions = new Set([
    'min',
    'max',
    'round',
    'floor',
    'ceil',
    'abs',
    'sqrt',
  ]);

  /**
   * Safely evaluate a mathematical / conditional formula using provided context
   */
  public static evaluate(
    expression: string,
    context: FormulaEvaluationContext
  ): { result: number; error?: string } {
    try {
      const cleanExpr = expression.trim();
      if (!cleanExpr) {
        return { result: 0 };
      }

      // Merge variables and parameters into unified token scope
      const scope: Record<string, any> = {
        ...context.parameters,
        ...context.variables,
      };

      // Check for illegal patterns (window, document, fetch, import, require, eval, prototype, __proto__, etc.)
      const dangerousPatterns = /(window|document|fetch|import|require|process|global|constructor|prototype|__proto__|Function|eval|setTimeout|setInterval)/i;
      if (dangerousPatterns.test(cleanExpr)) {
        throw new Error('Expression contains disallowed security tokens.');
      }

      // Tokenize and replace identifiers with numeric/boolean values from scope
      // Identifiers format: variable names or Math.function names
      const tokenized = cleanExpr.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (match) => {
        // Check if math function
        if (this.allowedMathFunctions.has(match)) {
          return `Math.${match}`;
        }
        if (match === 'Math' || match === 'true' || match === 'false' || match === 'null') {
          return match;
        }
        if (match in scope) {
          const val = scope[match];
          if (typeof val === 'number') return `${val}`;
          if (typeof val === 'boolean') return `${val}`;
          if (typeof val === 'string' && !isNaN(Number(val))) return `${Number(val)}`;
          return JSON.stringify(val);
        }
        // Unknown variable defaults to 0
        return '0';
      });

      // Safe parse calculation via restricted Math evaluator
      // Validate that tokenized expression contains only safe math symbols
      const safeCharacters = /^[0-9+\-*/%().,\s><=!&|?:Math.minaxroundflcebsqrt"'truefalsenull]+$/;
      if (!safeCharacters.test(tokenized)) {
        throw new Error(`Expression contains illegal characters: ${tokenized}`);
      }

      // Execute in isolated function with no outer scope
      const computeFn = new Function('Math', `"use strict"; return (${tokenized});`);
      const rawRes = computeFn(Math);

      const numRes = typeof rawRes === 'number' && !isNaN(rawRes) && isFinite(rawRes) ? rawRes : 0;
      return { result: Number(numRes.toFixed(4)) };
    } catch (err) {
      return {
        result: 0,
        error: err instanceof Error ? err.message : 'Calculation error',
      };
    }
  }

  /**
   * Validate formula syntax before activating a rule
   */
  public static validateFormula(
    expression: string,
    sampleVariables: Record<string, number>,
    parameters: Record<string, any>
  ): { isValid: boolean; errorMessage?: string } {
    const res = this.evaluate(expression, {
      variables: sampleVariables,
      parameters,
    });
    if (res.error) {
      return { isValid: false, errorMessage: res.error };
    }
    return { isValid: true };
  }
}
