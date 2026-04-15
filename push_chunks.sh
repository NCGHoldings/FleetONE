#!/bin/bash
# Force Git to be extremely patient with slow or dropping internet connections!
git config --global http.postBuffer 524288000
git config --global http.lowSpeedLimit 1000
git config --global http.lowSpeedTime 600

git remote remove lovable-loop 2>/dev/null
git remote add lovable-loop https://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@github.com/NCGHoldings/ncg-fleetone-aff76110.git

COUNT=0
for COMMIT in $(git log --reverse --format="%H"); do
  COUNT=$((COUNT+1))
  if [ $((COUNT % 50)) -eq 0 ]; then
    echo "Uploading micro-chunk $COUNT..."
    git push -f lovable-loop $COMMIT:refs/heads/main
  fi
done

echo "Uploading final micro-chunk...!"
git push -f lovable-loop main
