# Employee Salary Calculation Logic

This document explains the mathematical and logical formulas used by the HRMS to calculate monthly employee salary slips, using the exact values from the May 2026 salary slip generation as a concrete example.

---

## 1. Core Inputs & Variables

The calculation relies on the following inputs from the attendance summary and the employee's Cost to Company (CTC) profile:

| Input Field / Variable | Description | May 2026 Value |
| :--- | :--- | :---: |
| **Joining Monthly Gross** | Base gross salary defined in employee CTC | `₹23,999.00` |
| **Month Work Days (MWD)** | Total working days in the month (excluding week-offs) | `26` |
| **Paid Week-Off (PWO)** | Paid rest days (e.g., Sundays) | `5` |
| **Paid Holidays (PH)** | Gazetted company holidays for the month | `0` |
| **Emp Work Days (EWD)** | Days the employee actually worked | `6` |
| **Paid Leave (PL)** | Approved paid leaves taken by the employee | `2.5` |
| **Unpaid Leave (UL)** | Approved unpaid leaves taken by the employee | `0` |
| **Extra Days Paid (EDP)** | Additional paid working days (overtime/holidays) | `0` |

---

## 2. Step-by-Step Mathematical Formula

### Step 1: Calculate Total Divisor Days
The total divisor represents the total count of paid-eligible days in a full month.
$$\text{Total Divisor} = \text{Month Work Days (MWD)} + \text{Paid Week-Off (PWO)} + \text{Paid Holidays (PH)}$$
$$\text{Total Divisor} = 26 + 5 + 0 = 31\text{ days}$$

### Step 2: Calculate Paid Days
Paid Days are the days for which the employee is entitled to receive salary.
$$\text{Paid Days} = \text{Emp Work Days (EWD)} + \text{Paid Leave (PL)} + \text{Paid Holidays (PH)} + \text{Paid Week-Off (PWO)} + \text{Extra Days Paid (EDP)}$$
$$\text{Paid Days} = 6 + 2.5 + 0 + 5 + 0 = 13.5\text{ days}$$

### Step 3: Calculate Per-Day Salary
Salary earned per single eligible day.
$$\text{Per Day Salary} = \frac{\text{Joining Monthly Gross}}{\text{Total Divisor}}$$
$$\text{Per Day Salary} = \frac{23,999.00}{31} = \text{₹774.16}$$ *(rounded to 2 decimal places)*

### Step 4: Calculate This Month's Pro-rated Gross Salary
The total gross amount earned by the employee based on their active paid days during the month.
$$\text{This Month Gross} = \text{Per Day Salary} \times \text{Paid Days}$$
$$\text{This Month Gross} = 774.16129 \times 13.5 = \text{₹10,451.16}$$ *(rounded)*

### Step 5: Pro-rate Earnings Components
All fixed earnings components defined in the employee's CTC are scaled proportionally according to the actual gross earned this month:
$$\text{Calculated Component} = \left( \frac{\text{Base Component Amount}}{\text{Joining Monthly Gross}} \right) \times \text{This Month Gross}$$

* **Basic Salary:**
  $$\text{Calculated Basic} = \left( \frac{18,000.00}{23,999.00} \right) \times 10,451.16 = \text{₹7,838.70}$$
* **Special Allowance:**
  $$\text{Calculated Special Allowance} = \left( \frac{5,999.00}{23,999.00} \right) \times 10,451.16 = \text{₹2,612.46}$$
* **HRA:**
  $$\text{Calculated HRA} = \left( \frac{0.00}{23,999.00} \right) \times 10,451.16 = \text{₹0.00}$$

### Step 6: Sum Total Earnings
$$\text{Total Earnings} = \text{Sum of Pro-rated Components} + \text{Other Earnings}$$
$$\text{Total Earnings} = 7,838.70 + 2,612.46 + 0.00 + 0 = \text{₹10,451.16}$$

### Step 7: Apply Deductions
Deductions defined in the employee CTC (e.g., Professional Tax, ESI, PF) are applied as flat values:
* **Professional Tax (PT):** `₹500.00`
* **ESI:** `₹0.00`
* **PF (Provident Fund):** `₹0.00`
* **Other Deduction:** `₹0`

$$\text{Total Deductions} = \text{Sum of Deductions} + \text{Other Deduction}$$
$$\text{Total Deductions} = 500.00 + 0.00 + 0.00 + 0 = \text{₹500.00}$$

### Step 8: Calculate Net Salary Payout
The final take-home salary transferred to the employee.
$$\text{Net Salary Payout} = \text{Total Earnings} - \text{Total Deductions}$$
$$\text{Net Salary Payout} = 10,451.16 - 500.00 = \text{₹9,951.16}$$
