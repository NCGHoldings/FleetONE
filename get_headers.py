import pandas as pd

try:
    df = pd.read_excel('Hire Done Report.xlsx Original.xlsx')
    print(df.columns.tolist())
    print("\n\nFirst Row Sample:")
    print(df.iloc[0].to_dict())
except Exception as e:
    print(f"Error reading Excel file: {e}")
