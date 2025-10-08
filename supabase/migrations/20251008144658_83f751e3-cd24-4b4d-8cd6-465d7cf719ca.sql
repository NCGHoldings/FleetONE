-- Create trigger to auto-generate quotation_no for yutong_quotations
CREATE OR REPLACE TRIGGER set_yutong_quotation_no_trigger
BEFORE INSERT ON yutong_quotations
FOR EACH ROW
EXECUTE FUNCTION set_yutong_quotation_no();