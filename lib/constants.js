export const MESSAGE_TYPES = {
  FIDELIZATION_7D: 'fidelization_7d',
  ACTIVATION_15D: 'activation_15d',
  REACTIVATION_30D: 'reactivation_30d',
  RECOVERY_6M: 'recovery_6m',
};

export const MESSAGE_DELAYS_DAYS = {
  [MESSAGE_TYPES.FIDELIZATION_7D]: 7,
  [MESSAGE_TYPES.ACTIVATION_15D]: 15,
  [MESSAGE_TYPES.REACTIVATION_30D]: 30,
  [MESSAGE_TYPES.RECOVERY_6M]: 180,
};

// Importe minimo en centimos (100 EUR)
export const MIN_AMOUNT_CENTS = 10000;
