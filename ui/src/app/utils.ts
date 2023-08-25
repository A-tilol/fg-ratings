export const updatedStyle = (isUpdated: boolean) => {
  if (isUpdated)
    return 'background:linear-gradient(transparent 80%, rgba(102, 204, 255, 0.7) 70%);';
  return '';
};
