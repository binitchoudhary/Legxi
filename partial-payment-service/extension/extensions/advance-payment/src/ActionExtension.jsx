import {
  reactExtension,
  useApi,
  AdminAction,
  BlockStack,
  Button,
  Select,
  Text,
  TextField,
  InlineStack,
  Divider,
  Banner
} from '@shopify/ui-extensions-react/admin';
import { useState, useEffect } from 'react';

// Target for Draft Order Action
export default reactExtension(
  'admin.draft-order-details.action.render',
  () => <PartialPaymentAction />
);

function PartialPaymentAction() {
  const api = useApi();
  const { extension, getSessionToken, data, query } = api;
  const draftOrderId = data?.selected?.[0]?.id; // Ensure optional chaining is extremely safe

  const [uiState, setUiState] = useState('loading_draft'); // loading_draft, form, confirm, submitting, success, error
  
  // Draft Order State
  const [draftTotal, setDraftTotal] = useState(0);
  const [draftCurrency, setDraftCurrency] = useState('INR');
  
  // Form State
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [staffNote, setStaffNote] = useState('');
  
  // Validation State
  const [validationError, setValidationError] = useState('');
  
  // Error/Success State
  const [globalError, setGlobalError] = useState('');
  const [successData, setSuccessData] = useState(null);

  // Load Draft Order details on mount
  useEffect(() => {
    async function loadDraft() {
      try {
        if (!draftOrderId) {
           setGlobalError('Draft order ID is not available.');
           setUiState('error');
           return;
        }
        
        // Ensure query exists
        if (typeof query !== 'function') {
           setGlobalError('query function is not available on useApi().');
           setUiState('error');
           return;
        }

        const res = await query(`
          query {
            draftOrder(id: "${draftOrderId}") {
              totalPriceSet { shopMoney { amount currencyCode } }
            }
          }
        `);
        
        if (res.errors && res.errors.length > 0) {
           setGlobalError('GraphQL Error: ' + res.errors[0].message);
           setUiState('error');
           return;
        }

        const total = parseFloat(res.data?.draftOrder?.totalPriceSet?.shopMoney?.amount || 0);
        const currency = res.data?.draftOrder?.totalPriceSet?.shopMoney?.currencyCode || 'INR';
        setDraftTotal(total);
        setDraftCurrency(currency);
        setUiState('form');
      } catch (err) {
        setGlobalError('Failed to load Draft Order details: ' + (err.message || String(err)));
        setUiState('error');
      }
    }
    loadDraft();
  }, [draftOrderId, query]);

  // Live Validation
  useEffect(() => {
    if (uiState !== 'form') return;
    
    if (!advanceAmount || advanceAmount.trim() === '') {
      setValidationError('Advance amount is required.');
      return;
    }

    const num = parseFloat(advanceAmount);
    if (isNaN(num)) {
      setValidationError('Please enter a valid number.');
      return;
    }
    
    if (num <= 0) {
      setValidationError('Advance amount must be greater than zero.');
      return;
    }

    if (num >= draftTotal) {
      setValidationError(`Advance must be strictly less than the order total (${draftCurrency} ${draftTotal}).`);
      return;
    }

    setValidationError('');
  }, [advanceAmount, draftTotal, uiState, draftCurrency]);

  const handleReview = () => {
    setUiState('confirm');
  };

  const handleSubmit = async () => {
    setUiState('submitting');
    setGlobalError('');

    try {
      // In newer API versions, getSessionToken is replaced by auth.idToken()
      // Fallback in case either exists
      let token = '';
      if (typeof getSessionToken === 'function') {
         token = await getSessionToken();
      } else if (api.auth && typeof api.auth.idToken === 'function') {
         token = await api.auth.idToken();
      } else {
         throw new Error('Authentication method not found on useApi()');
      }
      
      // Use build-time environment variable injected by Shopify CLI
      const BACKEND_URL = process.env.BACKEND_URL;
      
      if (!BACKEND_URL) {
        throw new Error('BACKEND_URL environment variable is missing.');
      }
      
      const payload = {
        idempotencyKey: crypto.randomUUID(), // Generates unique ID for idempotency
        draftOrderId,
        advanceAmount: parseFloat(advanceAmount).toString(),
        currency: draftCurrency,
        paymentMode,
        staffNote
      };

      const response = await fetch(`${BACKEND_URL}/api/v1/partial-payment/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Bypass-Tunnel-Reminder': 'true'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const body = await response.json();
        // Fallback for 502/503 network layer failures before reaching express
        throw new Error(body.error || 'The server encountered an issue processing the payment.');
      }

      const resData = await response.json();
      setSuccessData(resData.data); // Should contain orderId, orderName, etc.
      setUiState('success');

    } catch (err) {
      let friendlyMessage = 'Unable to contact the Partial Payment service. Please try again later.';
      if (err.message && err.message.toLowerCase() !== 'failed to fetch') {
        friendlyMessage = err.message;
      }
      setGlobalError(friendlyMessage);
      setUiState('error');
    }
  };

  const remainingBalance = draftTotal - (parseFloat(advanceAmount) || 0);

  // === RENDERS ===

  if (uiState === 'loading_draft' || uiState === 'submitting') {
    return (
      <AdminAction primaryAction={<Button disabled>Processing</Button>} secondaryAction={<Button onPress={() => extension.close()}>Cancel</Button>}>
        <BlockStack alignment="center" spacing="loose">
          <Text>{uiState === 'loading_draft' ? 'Loading Draft Order...' : 'Creating Partial Payment Order...'}</Text>
        </BlockStack>
      </AdminAction>
    );
  }

  if (uiState === 'success') {
    return (
      <AdminAction 
        primaryAction={<Button onPress={() => extension.close()}>Close</Button>}
      >
        <BlockStack spacing="loose">
          <Banner status="success" title="Order Created Successfully">
            The partial payment was recorded and the order was created.
          </Banner>
          <BlockStack spacing="tight">
            <Text fontWeight="bold">Order Number:</Text>
            <Text>{successData?.orderName}</Text>
            
            <Text fontWeight="bold">Total Amount:</Text>
            <Text>{draftCurrency} {draftTotal}</Text>
            
            <Text fontWeight="bold">Paid Amount:</Text>
            <Text>{draftCurrency} {advanceAmount}</Text>
            
            <Text fontWeight="bold">Outstanding Amount:</Text>
            <Text>{draftCurrency} {remainingBalance}</Text>
          </BlockStack>
        </BlockStack>
      </AdminAction>
    );
  }

  if (uiState === 'error') {
    return (
      <AdminAction 
        primaryAction={<Button onPress={() => setUiState('form')}>Try Again</Button>}
        secondaryAction={<Button onPress={() => extension.close()}>Cancel</Button>}
      >
        <BlockStack spacing="loose">
          <Banner status="critical" title="Payment Failed">
            {globalError}
          </Banner>
        </BlockStack>
      </AdminAction>
    );
  }

  if (uiState === 'confirm') {
    return (
      <AdminAction 
        primaryAction={<Button onPress={handleSubmit} tone="critical">Confirm & Create Order</Button>}
        secondaryAction={<Button onPress={() => setUiState('form')}>Back</Button>}
      >
        <BlockStack spacing="loose">
          <Text variant="headingLg">Review Partial Payment</Text>
          <Banner status="warning">
            This action will convert this Draft Order into an official Order marked as Partially Paid. This cannot be undone.
          </Banner>
          <Divider />
          <BlockStack spacing="tight">
            <InlineStack inlineAlignment="space-between">
              <Text fontWeight="bold">Order Total:</Text>
              <Text>{draftCurrency} {draftTotal}</Text>
            </InlineStack>
            <InlineStack inlineAlignment="space-between">
              <Text fontWeight="bold">Advance Received:</Text>
              <Text>{draftCurrency} {advanceAmount}</Text>
            </InlineStack>
            <InlineStack inlineAlignment="space-between">
              <Text fontWeight="bold">Outstanding Balance:</Text>
              <Text>{draftCurrency} {remainingBalance}</Text>
            </InlineStack>
            <Divider />
            <InlineStack inlineAlignment="space-between">
              <Text fontWeight="bold">Payment Mode:</Text>
              <Text>{paymentMode}</Text>
            </InlineStack>
            <InlineStack inlineAlignment="space-between">
              <Text fontWeight="bold">Staff Note:</Text>
              <Text>{staffNote || 'None'}</Text>
            </InlineStack>
          </BlockStack>
        </BlockStack>
      </AdminAction>
    );
  }

  // default: 'form'
  return (
    <AdminAction 
      primaryAction={<Button onPress={handleReview} disabled={!!validationError}>Review Payment</Button>}
      secondaryAction={<Button onPress={() => extension.close()}>Cancel</Button>}
    >
      <BlockStack spacing="loose">
        <Text variant="headingLg">Record Advance Payment</Text>
        
        <InlineStack inlineAlignment="space-between" blockAlignment="center">
          <Text>Order Total:</Text>
          <Text fontWeight="bold">{draftCurrency} {draftTotal}</Text>
        </InlineStack>

        <TextField 
          label="Advance Amount Received"
          type="number"
          value={advanceAmount}
          onChange={(val) => setAdvanceAmount(val)}
          error={validationError}
          autoComplete="off"
        />

        <InlineStack inlineAlignment="space-between" blockAlignment="center">
          <Text>Remaining Balance:</Text>
          <Text fontWeight="bold" tone={remainingBalance < 0 ? 'critical' : 'success'}>
            {draftCurrency} {isNaN(remainingBalance) ? '0' : remainingBalance}
          </Text>
        </InlineStack>

        <Select 
          label="Payment Mode"
          value={paymentMode}
          onChange={(val) => setPaymentMode(val)}
          options={[
            { label: 'Cash', value: 'Cash' },
            { label: 'UPI', value: 'UPI' },
            { label: 'Bank Transfer', value: 'Bank Transfer' },
            { label: 'Razorpay', value: 'Razorpay' },
            { label: 'Other', value: 'Other' }
          ]}
        />

        <TextField 
          label="Staff Note (Optional)"
          value={staffNote}
          onChange={(val) => setStaffNote(val)}
          autoComplete="off"
          multiline={2}
        />
      </BlockStack>
    </AdminAction>
  );
}
